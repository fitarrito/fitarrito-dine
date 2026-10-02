import { NextResponse } from "next/server";
import {
  getSupabaseAdminClient,
  getSupabaseAdminConfig,
} from "@lib/getSupabaseAdmin";
import { getPreparationEstimate } from "@lib/whatsapp/customerConfirmation";

export const dynamic = "force-dynamic";

function deliveryLocation(order: {
  area?: string | null;
  delivery_address_type?: string | null;
  delivery_location_name?: string | null;
  delivery_address?: string | null;
  delivery_area?: string | null;
  delivery_city?: string | null;
  delivery_pincode?: string | null;
  delivery_landmark?: string | null;
}) {
  if (order.delivery_address_type === "normal_address") {
    return [
      order.delivery_address,
      order.delivery_area,
      order.delivery_city,
      order.delivery_pincode,
      order.delivery_landmark,
    ]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(", ");
  }

  return order.delivery_location_name?.trim() || order.area?.trim() || "";
}

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
      .select(
        "id, customer_name, customer_phone, area, delivery_address_type, delivery_location_name, delivery_address, delivery_area, delivery_city, delivery_pincode, delivery_landmark, delivery_instructions, subtotal, delivery_charge, total, payment_method, status, created_at, updated_at, preparation_time_minutes",
      )
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
        "id, menu_item_id, item_name, selected_protein, unit_price, quantity, base_price, protein_price",
      )
      .eq("order_id", orderId);

    if (itemsError) {
      console.error(`Unable to load items for order ${orderId}:`, itemsError);

      return NextResponse.json(
        { error: "Unable to load order items." },
        { status: 500 },
      );
    }

    const menuIds = [
      ...new Set(
        (items ?? [])
          .map((item) => String(item.menu_item_id ?? ""))
          .filter(Boolean),
      ),
    ];
    const images = new Map<string, string>();

    if (menuIds.length > 0) {
      const { data: menuItems } = await supabaseAdmin
        .from("MenuItem")
        .select("id, imageUrl")
        .in("id", menuIds);

      for (const menuItem of menuItems ?? []) {
        const image = menuItem.imageUrl;

        if (image) images.set(String(menuItem.id), image);
      }
    }

    const preparation = getPreparationEstimate(order.preparation_time_minutes);

    return NextResponse.json({
      order: {
        id: order.id,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        deliveryLocation: deliveryLocation(order),
        deliveryInstructions: order.delivery_instructions,
        subtotal: Number(order.subtotal),
        deliveryCharge: Number(order.delivery_charge),
        total: Number(order.total),
        paymentMethod: order.payment_method,
        status: order.status,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        preparationLabel: preparation?.label ?? null,
      },
      items: (items ?? []).map((item) => ({
        id: item.id,
        name: item.item_name,
        protein: item.selected_protein,
        unitPrice: Number(item.unit_price),
        quantity: Number(item.quantity),
        basePrice: Number(item.base_price),
        proteinPrice: Number(item.protein_price),
        imageUrl: images.get(String(item.menu_item_id ?? "")) ?? null,
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
