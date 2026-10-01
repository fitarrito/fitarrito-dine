import { NextResponse } from "next/server";
import {
  getSupabaseAdminClient,
  getSupabaseAdminConfig,
} from "@lib/getSupabaseAdmin";
import { verifyStaffOrderConfirmationToken } from "@lib/staffOrderConfirmation";
import {
  createCustomerOrderWhatsAppLink,
  getPreparationEstimate,
  isPreparationMinutes,
  normalizeCustomerWhatsAppPhone,
  type PreparationMinutes,
} from "@lib/whatsapp/customerConfirmation";

export const dynamic = "force-dynamic";

type StaffOrderAction = "inspect" | "confirm";

type StaffOrderRow = {
  id: string | number;
  customer_name: string;
  customer_phone: string | null;
  area: string | null;
  total: number | string;
  payment_method: string;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
  preparation_time_minutes?: number | null;
};

const ORDER_COLUMNS =
  "id, customer_name, customer_phone, area, total, payment_method, status, created_at, updated_at, preparation_time_minutes";
const ORDER_COLUMNS_WITHOUT_PREPARATION =
  "id, customer_name, customer_phone, area, total, payment_method, status, created_at, updated_at";

function json(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function missingPreparationColumn(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";

  return (
    error?.code === "PGRST204" ||
    error?.code === "42703" ||
    message.includes("preparation_time_minutes")
  );
}

function notificationFor(order: StaffOrderRow) {
  const preparation = getPreparationEstimate(order.preparation_time_minutes);
  const phoneIsValid = Boolean(
    normalizeCustomerWhatsAppPhone(order.customer_phone ?? ""),
  );
  const whatsappUrl =
    order.status === "confirmed" && preparation
      ? createCustomerOrderWhatsAppLink({
          customerName: order.customer_name,
          customerPhone: order.customer_phone ?? "",
          orderId: order.id,
          preparationTime: preparation.label,
        })
      : null;

  let whatsappError: string | null = null;

  if (order.status === "confirmed" && !preparation) {
    whatsappError =
      "Choose a preparation time before notifying the customer on WhatsApp.";
  } else if (order.status === "confirmed" && !phoneIsValid) {
    whatsappError =
      "This order does not have a valid customer phone number, so WhatsApp cannot be opened.";
  }

  return {
    preparationMinutes: preparation?.minutes ?? null,
    preparationLabel: preparation?.label ?? null,
    customerPhoneValid: phoneIsValid,
    whatsappUrl,
    whatsappError,
  };
}

function presentOrder(order: StaffOrderRow) {
  return {
    id: order.id,
    customerName: order.customer_name,
    deliveryLocation: order.area,
    total: Number(order.total),
    paymentMethod: order.payment_method,
    status: order.status,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    ...notificationFor(order),
  };
}

export async function POST(request: Request) {
  if (!getSupabaseAdminConfig()) {
    return json({ error: "Order confirmation is unavailable." }, 503);
  }

  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token : "";
    const action = body.action as StaffOrderAction;
    const preparationMinutes = isPreparationMinutes(body.preparationMinutes)
      ? body.preparationMinutes
      : null;

    if (!token || (action !== "inspect" && action !== "confirm")) {
      return json({ error: "Invalid confirmation request." }, 400);
    }

    const authorization = verifyStaffOrderConfirmationToken(token);

    if (!authorization.valid) {
      return json(
        {
          error:
            authorization.reason === "expired"
              ? "This confirmation link has expired."
              : "This confirmation link is invalid.",
        },
        401,
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const loadedOrder = await loadStaffOrder(authorization.orderId);

    if (loadedOrder.error) {
      return json({ error: loadedOrder.error }, loadedOrder.status);
    }

    if (!loadedOrder.order) {
      return json({ error: "Order not found." }, 404);
    }

    const staffOrder = loadedOrder.order;

    if (action === "inspect") {
      return json({ order: presentOrder(staffOrder) });
    }

    if (staffOrder.status === "confirmed") {
      return json(await confirmedResponse(staffOrder, preparationMinutes));
    }

    if (staffOrder.status !== "pending") {
      return json(
        {
          error: `Order #${staffOrder.id} cannot be confirmed because its status is "${staffOrder.status}".`,
          orderId: staffOrder.id,
          status: staffOrder.status,
        },
        409,
      );
    }

    if (!preparationMinutes) {
      return json(
        { error: "Select a preparation time before confirming this order." },
        400,
      );
    }

    const updatedAt = new Date().toISOString();
    const { data: confirmedOrder, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "confirmed",
        preparation_time_minutes: preparationMinutes,
        updated_at: updatedAt,
      })
      .eq("id", staffOrder.id)
      .eq("status", "pending")
      .select(ORDER_COLUMNS)
      .maybeSingle();

    if (missingPreparationColumn(updateError)) {
      console.error(
        `Unable to save preparation time for order ${staffOrder.id}:`,
        updateError,
      );

      return json(
        {
          error:
            "Preparation time is not available yet. Apply the preparation_time_minutes database migration.",
        },
        503,
      );
    }

    if (updateError) {
      console.error(`Unable to confirm order ${staffOrder.id}:`, updateError);
      return json({ error: "Unable to confirm this order." }, 500);
    }

    if (!confirmedOrder) {
      const { data: currentOrder } = await supabaseAdmin
        .from("orders")
        .select(ORDER_COLUMNS)
        .eq("id", staffOrder.id)
        .single();

      if (currentOrder?.status === "confirmed") {
        return json(
          await confirmedResponse(
            currentOrder as StaffOrderRow,
            preparationMinutes,
          ),
        );
      }

      return json(
        {
          error: `Order #${staffOrder.id} is no longer pending and was not confirmed.`,
          orderId: staffOrder.id,
          status: currentOrder?.status ?? "unknown",
        },
        409,
      );
    }

    console.log(
      `Order ${confirmedOrder.id} confirmed by staff with preparation time ${preparationMinutes} minutes`,
    );

    const confirmed = confirmedOrder as StaffOrderRow;

    return json({
      success: true,
      alreadyConfirmed: false,
      orderId: confirmed.id,
      status: confirmed.status,
      updatedAt: confirmed.updated_at,
      ...notificationFor(confirmed),
    });
  } catch (error) {
    console.error("Staff order confirmation error:", error);
    return json({ error: "Unable to process order confirmation." }, 500);
  }
}

async function loadStaffOrder(orderId: string) {
  const supabaseAdmin = getSupabaseAdminClient();
  const withPreparation = await supabaseAdmin
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("id", orderId)
    .single();

  if (!missingPreparationColumn(withPreparation.error)) {
    if (withPreparation.error || !withPreparation.data) {
      return { order: null, error: "Order not found.", status: 404 as const };
    }

    return {
      order: withPreparation.data as StaffOrderRow,
      error: null,
      status: 200 as const,
    };
  }

  console.error(
    "orders.preparation_time_minutes is missing. Apply supabase/migrations/20261001180000_add_order_preparation_time_minutes.sql.",
  );

  const withoutPreparation = await supabaseAdmin
    .from("orders")
    .select(ORDER_COLUMNS_WITHOUT_PREPARATION)
    .eq("id", orderId)
    .single();

  if (withoutPreparation.error || !withoutPreparation.data) {
    return { order: null, error: "Order not found.", status: 404 as const };
  }

  return {
    order: {
      ...(withoutPreparation.data as StaffOrderRow),
      preparation_time_minutes: null,
    },
    error: null,
    status: 200 as const,
  };
}

async function confirmedResponse(
  order: StaffOrderRow,
  preparationMinutes: PreparationMinutes | null,
) {
  let current = order;

  if (!getPreparationEstimate(order.preparation_time_minutes) && preparationMinutes) {
    const updatedAt = new Date().toISOString();
    const supabaseAdmin = getSupabaseAdminClient();
    const { data: updatedOrder, error } = await supabaseAdmin
      .from("orders")
      .update({
        preparation_time_minutes: preparationMinutes,
        updated_at: updatedAt,
      })
      .eq("id", order.id)
      .eq("status", "confirmed")
      .select(ORDER_COLUMNS)
      .maybeSingle();

    if (error) {
      console.error(
        `Unable to save preparation time for confirmed order ${order.id}:`,
        error,
      );
    } else if (updatedOrder) {
      current = updatedOrder as StaffOrderRow;
    }
  }

  console.log(`Order ${current.id} was already confirmed`);

  return {
    success: true,
    alreadyConfirmed: true,
    orderId: current.id,
    status: current.status,
    updatedAt: current.updated_at,
    ...notificationFor(current),
  };
}
