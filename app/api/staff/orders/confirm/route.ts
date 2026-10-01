import { NextResponse } from "next/server";
import {
  getSupabaseAdminClient,
  getSupabaseAdminConfig,
} from "@lib/getSupabaseAdmin";
import { verifyStaffOrderConfirmationToken } from "@lib/staffOrderConfirmation";

export const dynamic = "force-dynamic";

type StaffOrderAction = "inspect" | "confirm";

function json(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!getSupabaseAdminConfig()) {
    return json({ error: "Order confirmation is unavailable." }, 503);
  }

  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token : "";
    const action = body.action as StaffOrderAction;

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
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(
        "id, customer_name, area, total, payment_method, status, created_at, updated_at",
      )
      .eq("id", authorization.orderId)
      .single();

    if (orderError || !order) {
      return json({ error: "Order not found." }, 404);
    }

    if (action === "inspect") {
      return json({
        order: {
          id: order.id,
          customerName: order.customer_name,
          deliveryLocation: order.area,
          total: Number(order.total),
          paymentMethod: order.payment_method,
          status: order.status,
          createdAt: order.created_at,
          updatedAt: order.updated_at,
        },
      });
    }

    if (order.status === "confirmed") {
      return json({
        success: true,
        alreadyConfirmed: true,
        orderId: order.id,
        status: order.status,
      });
    }

    if (order.status !== "pending") {
      return json(
        {
          error: `Order #${order.id} cannot be confirmed because its status is "${order.status}".`,
          orderId: order.id,
          status: order.status,
        },
        409,
      );
    }

    const updatedAt = new Date().toISOString();
    const { data: confirmedOrder, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "confirmed",
        updated_at: updatedAt,
      })
      .eq("id", order.id)
      .eq("status", "pending")
      .select("id, status, updated_at")
      .maybeSingle();

    if (updateError) {
      console.error(`Unable to confirm order ${order.id}:`, updateError);
      return json({ error: "Unable to confirm this order." }, 500);
    }

    if (!confirmedOrder) {
      const { data: currentOrder } = await supabaseAdmin
        .from("orders")
        .select("id, status")
        .eq("id", order.id)
        .single();

      if (currentOrder?.status === "confirmed") {
        return json({
          success: true,
          alreadyConfirmed: true,
          orderId: currentOrder.id,
          status: currentOrder.status,
        });
      }

      return json(
        {
          error: `Order #${order.id} is no longer pending and was not confirmed.`,
          orderId: order.id,
          status: currentOrder?.status ?? "unknown",
        },
        409,
      );
    }

    console.log(`Order ${confirmedOrder.id} confirmed by staff`);

    return json({
      success: true,
      alreadyConfirmed: false,
      orderId: confirmedOrder.id,
      status: confirmedOrder.status,
      updatedAt: confirmedOrder.updated_at,
    });
  } catch (error) {
    console.error("Staff order confirmation error:", error);
    return json({ error: "Unable to process order confirmation." }, 500);
  }
}
