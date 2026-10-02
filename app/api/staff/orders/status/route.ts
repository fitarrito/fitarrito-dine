import { NextResponse } from "next/server";
import {
  getSupabaseAdminClient,
  getSupabaseAdminConfig,
} from "@lib/getSupabaseAdmin";
import { hasStaffSession } from "@lib/staffSession";
import {
  createCustomerOrderWhatsAppLink,
  createCustomerPreparedWhatsAppLink,
  getPreparationEstimate,
  isPreparationMinutes,
} from "@lib/whatsapp/customerConfirmation";

export const dynamic = "force-dynamic";

type StaffAction = "confirm" | "prepared";

function json(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function notificationFor(input: {
  customerName: string;
  customerPhone: string | null;
  orderId: string | number;
  status: string;
  preparationLabel: string | null;
}) {
  const url =
    input.status === "confirmed" && input.preparationLabel
      ? createCustomerOrderWhatsAppLink({
          customerName: input.customerName,
          customerPhone: input.customerPhone ?? "",
          orderId: input.orderId,
          preparationTime: input.preparationLabel,
        })
      : input.status === "preparing"
        ? createCustomerPreparedWhatsAppLink({
            customerName: input.customerName,
            customerPhone: input.customerPhone ?? "",
            orderId: input.orderId,
          })
        : null;

  if (!url) {
    return {
      ready: false,
      sent: false,
      channel: null,
      url: null,
      message:
        "The order was updated, but the customer phone is missing or invalid, so no WhatsApp message was created.",
    };
  }

  return {
    ready: true,
    sent: false,
    channel: "whatsapp",
    url,
    message:
      "WhatsApp is ready with the customer message. Staff must tap Send. The message has not been sent automatically.",
  };
}

export async function POST(request: Request) {
  if (!(await hasStaffSession())) {
    return json({ error: "Staff sign-in is required." }, 401);
  }

  if (!getSupabaseAdminConfig()) {
    return json({ error: "Order updates are temporarily unavailable." }, 503);
  }

  const body = await request.json().catch(() => ({}));
  const orderId = String(body.orderId ?? "").trim();
  const action = body.action as StaffAction;
  const preparationMinutes = isPreparationMinutes(body.preparationMinutes)
    ? body.preparationMinutes
    : null;

  if (!orderId || (action !== "confirm" && action !== "prepared")) {
    return json({ error: "Invalid order update." }, 400);
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id, customer_name, customer_phone, status, preparation_time_minutes, payment_method",
    )
    .eq("id", orderId)
    .single();

  if (error || !order) {
    return json({ error: "Order not found." }, 404);
  }

  if (order.status === "cancelled") {
    return json(
      { error: `Order #${order.id} is cancelled and cannot be updated.` },
      409,
    );
  }

  if (action === "confirm" && (order.status === "confirmed" || order.status === "preparing")) {
    const preparation = getPreparationEstimate(order.preparation_time_minutes);

    return json({
      success: true,
      alreadyUpdated: true,
      orderId: order.id,
      status: order.status,
      notification: notificationFor({
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        orderId: order.id,
        status: order.status,
        preparationLabel: preparation?.label ?? null,
      }),
    });
  }

  if (action === "prepared" && order.status === "preparing") {
    return json({
      success: true,
      alreadyUpdated: true,
      orderId: order.id,
      status: order.status,
      notification: notificationFor({
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        orderId: order.id,
        status: order.status,
        preparationLabel: null,
      }),
    });
  }

  if (action === "confirm" && order.status !== "pending") {
    return json(
      {
        error: `Order #${order.id} cannot be confirmed from status "${order.status}".`,
      },
      409,
    );
  }

  if (action === "prepared" && order.status !== "confirmed") {
    return json(
      {
        error: `Order #${order.id} must be confirmed before it can be marked prepared.`,
      },
      409,
    );
  }

  if (action === "confirm" && !preparationMinutes) {
    return json({ error: "Select a preparation time before confirming." }, 400);
  }

  const updatedAt = new Date().toISOString();
  const nextStatus = action === "confirm" ? "confirmed" : "preparing";
  const update =
    action === "confirm"
      ? {
          status: nextStatus,
          preparation_time_minutes: preparationMinutes,
          updated_at: updatedAt,
        }
      : {
          status: nextStatus,
          updated_at: updatedAt,
        };

  const { data: updatedOrder, error: updateError } = await supabaseAdmin
    .from("orders")
    .update(update)
    .eq("id", order.id)
    .eq("status", order.status)
    .select("id, status, customer_name, customer_phone, preparation_time_minutes, payment_method")
    .maybeSingle();

  if (updateError) {
    console.error(`Unable to update order ${order.id}:`, updateError);
    return json({ error: "Unable to update this order." }, 500);
  }

  if (!updatedOrder) {
    return json(
      { error: `Order #${order.id} changed before the update completed.` },
      409,
    );
  }

  console.log(`Order ${updatedOrder.id} status updated to ${updatedOrder.status}`);

  const preparation = getPreparationEstimate(updatedOrder.preparation_time_minutes);

  return json({
    success: true,
    alreadyUpdated: false,
    orderId: updatedOrder.id,
    status: updatedOrder.status,
    notification: notificationFor({
      customerName: updatedOrder.customer_name,
      customerPhone: updatedOrder.customer_phone,
      orderId: updatedOrder.id,
      status: updatedOrder.status,
      preparationLabel: preparation?.label ?? null,
    }),
  });
}
