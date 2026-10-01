import { NextResponse } from "next/server";
import {
  getSupabaseAdminClient,
  getSupabaseAdminConfig,
} from "@lib/getSupabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!getSupabaseAdminConfig()) {
    return NextResponse.json(
      { error: "Order details are temporarily unavailable." },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const orderId = String(body.orderId ?? "").trim();
    const sessionId = String(body.sessionId ?? "").trim();

    if (!orderId || !sessionId) {
      return NextResponse.json(
        { error: "Order ID and session are required." },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("session_id", sessionId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 },
      );
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from("order_items")
      .select(
        "id, item_name, selected_protein, unit_price, quantity, base_price, protein_price",
      )
      .eq("order_id", orderId);

    if (itemsError) {
      console.error(`Unable to load items for order ${orderId}:`, itemsError);

      return NextResponse.json(
        { error: "Unable to load order items." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      order: {
        id: order.id,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        deliveryLocation: order.area,
        deliveryInstructions: order.delivery_instructions,
        subtotal: Number(order.subtotal),
        deliveryCharge: Number(order.delivery_charge),
        total: Number(order.total),
        paymentMethod: order.payment_method,
        status: order.status,
        createdAt: order.created_at,
      },
      items: (items ?? []).map((item) => ({
        id: item.id,
        name: item.item_name,
        protein: item.selected_protein,
        unitPrice: Number(item.unit_price),
        quantity: Number(item.quantity),
        basePrice: Number(item.base_price),
        proteinPrice: Number(item.protein_price),
      })),
    });
  } catch (error) {
    console.error("Load order details error:", error);

    return NextResponse.json(
      { error: "Unable to load order details." },
      { status: 500 },
    );
  }
}
