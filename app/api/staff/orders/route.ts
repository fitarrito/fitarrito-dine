import { NextResponse } from "next/server";
import {
  getSupabaseAdminClient,
  getSupabaseAdminConfig,
} from "@lib/getSupabaseAdmin";
import { hasStaffSession } from "@lib/staffSession";
import { getPreparationEstimate } from "@lib/whatsapp/customerConfirmation";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = ["pending", "confirmed", "preparing"];

function json(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function paymentStatus(method: string) {
  const value = method.trim().toLowerCase();

  if (value === "razorpay" || value === "qr") return "Paid";
  if (value === "cash") return "Unpaid";

  return "Unknown";
}

function deliveryLocation(order: {
  area: string | null;
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

export async function GET() {
  if (!(await hasStaffSession())) {
    return json({ error: "Staff sign-in is required." }, 401);
  }

  if (!getSupabaseAdminConfig()) {
    return json({ error: "Order data is temporarily unavailable." }, 503);
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id, customer_name, customer_phone, area, delivery_address_type, delivery_location_name, delivery_address, delivery_area, delivery_city, delivery_pincode, delivery_landmark, total, payment_method, status, created_at, preparation_time_minutes",
    )
    .in("status", ACTIVE_STATUSES)
    .not("area", "is", null)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    console.error("Unable to load staff orders:", error);
    return json({ error: "Unable to load orders." }, 500);
  }

  const orderIds = (orders ?? []).map((order) => order.id);
  const { data: items, error: itemsError } = orderIds.length
    ? await supabaseAdmin
        .from("order_items")
        .select("id, order_id, item_name, selected_protein, quantity")
        .in("order_id", orderIds)
    : { data: [], error: null };

  if (itemsError) {
    console.error("Unable to load staff order items:", itemsError);
    return json({ error: "Unable to load order items." }, 500);
  }

  return json({
    orders: (orders ?? []).map((order) => ({
      id: order.id,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      deliveryLocation: deliveryLocation(order),
      total: Number(order.total),
      paymentMethod: order.payment_method,
      paymentStatus: paymentStatus(order.payment_method ?? ""),
      status: order.status,
      createdAt: order.created_at,
      preparationLabel: getPreparationEstimate(order.preparation_time_minutes)
        ?.label ?? null,
      items: (items ?? [])
        .filter((item) => item.order_id === order.id)
        .map((item) => ({
          id: item.id,
          name: item.item_name,
          protein: item.selected_protein,
          quantity: item.quantity,
        })),
    })),
  });
}
