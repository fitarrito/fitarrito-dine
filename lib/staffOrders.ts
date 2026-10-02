import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { getSupabaseAdminClient, getSupabaseAdminConfig } from "@lib/getSupabaseAdmin";
import { getPreparationEstimate } from "@lib/whatsapp/customerConfirmation";

const ACTIVE_STATUSES = ["pending", "confirmed", "preparing"];

const ORDER_COLUMNS = `
  id,
  customer_name,
  customer_phone,
  area,
  delivery_address_type,
  delivery_location_name,
  delivery_address,
  delivery_area,
  delivery_city,
  delivery_pincode,
  delivery_landmark,
  total,
  payment_method,
  status,
  created_at,
  updated_at,
  preparation_time_minutes,
  order_items (
    id,
    item_name,
    selected_protein,
    quantity
  )
`;

type OrderItemRow = {
  id: number;
  item_name: string;
  selected_protein: string | null;
  quantity: number;
};

type OrderRow = {
  id: number;
  customer_name: string;
  customer_phone: string;
  area: string | null;
  delivery_address_type?: string | null;
  delivery_location_name?: string | null;
  delivery_address?: string | null;
  delivery_area?: string | null;
  delivery_city?: string | null;
  delivery_pincode?: string | null;
  delivery_landmark?: string | null;
  total: number | string;
  payment_method: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  preparation_time_minutes: number | null;
  order_items: OrderItemRow[] | null;
};

export type StaffOrder = {
  id: number;
  customerName: string;
  customerPhone: string;
  deliveryLocation: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  preparationLabel: string | null;
  items: Array<{
    id: number;
    name: string;
    protein: string | null;
    quantity: number;
  }>;
};

function paymentStatus(method: string) {
  const value = method.trim().toLowerCase();

  if (value === "razorpay" || value === "qr") return "Paid";
  if (value === "cash") return "Unpaid";

  return "Unknown";
}

function deliveryLocation(order: OrderRow) {
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

function mapOrder(order: OrderRow): StaffOrder {
  return {
    id: order.id,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    deliveryLocation: deliveryLocation(order),
    total: Number(order.total),
    paymentMethod: order.payment_method,
    paymentStatus: paymentStatus(order.payment_method ?? ""),
    status: order.status,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    preparationLabel:
      getPreparationEstimate(order.preparation_time_minutes)?.label ?? null,
    items: (order.order_items ?? []).map((item) => ({
      id: item.id,
      name: item.item_name,
      protein: item.selected_protein,
      quantity: item.quantity,
    })),
  };
}

export function createStaffRealtimeClient(): SupabaseClient {
  const config = getSupabaseAdminConfig();

  if (!config) {
    throw new Error("Order data is temporarily unavailable.");
  }

  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: {
      transport: WebSocket as unknown as typeof globalThis.WebSocket,
    },
  });
}

export async function listActiveStaffOrders() {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(ORDER_COLUMNS)
    .in("status", ACTIVE_STATUSES)
    .not("area", "is", null)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) throw error;

  return ((data ?? []) as OrderRow[]).map(mapOrder);
}

export async function getActiveStaffOrder(orderId: number) {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("id", orderId)
    .in("status", ACTIVE_STATUSES)
    .not("area", "is", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapOrder(data as OrderRow);
}
