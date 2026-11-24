import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { getSupabaseAdminClient, getSupabaseAdminConfig } from "@lib/getSupabaseAdmin";
import { getPreparationEstimate } from "@lib/whatsapp/customerConfirmation";
import { decodeDessertSelection } from "@lib/desserts";
import { decodeSoupSelection } from "@lib/soups";
import {
  decodeSoupsBowlsSelection,
  formatSoupsBowlsChoice,
} from "@lib/soupsBowlsOrder";
import { unpackWaiterSelection } from "@lib/waiterSelection";

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
  delivery_instructions,
  special_requests,
  delivery_latitude,
  delivery_longitude,
  delivery_charge,
  total,
  payment_method,
  status,
  created_at,
  updated_at,
  preparation_time_minutes,
  order_source,
  order_items (
    id,
    item_name,
    selected_protein,
    item_format,
    quantity
  )
`;

type OrderItemRow = {
  id: number;
  item_name: string;
  selected_protein: string | null;
  item_format?: string | null;
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
  delivery_instructions?: string | null;
  special_requests?: string | null;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  delivery_charge?: number | string | null;
  total: number | string;
  payment_method: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  preparation_time_minutes: number | null;
  order_source?: string | null;
  order_items: OrderItemRow[] | null;
};

export type StaffOrder = {
  id: number;
  customerName: string;
  customerPhone: string;
  deliveryLocation: string;
  deliveryCharge: number | null;
  deliveryDistanceKm: number | null;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  preparationLabel: string | null;
  orderSource: string | null;
  specialRequests: string | null;
  deliveryInstructions: string | null;
  items: Array<{
    id: number;
    name: string;
    protein: string | null;
    format: string | null;
    quantity: number;
  }>;
};

function paymentStatus(method: string, status: string) {
  if (status === "delivered" || status === "settled") return "Paid";

  const value = method.trim().toLowerCase();

  if (value === "razorpay" || value === "qr") return "Paid";
  if (value === "cash") return "Unpaid";

  return "Unknown";
}

function deliveryLocation(order: OrderRow) {
  if (order.delivery_address_type === "normal_address") {
    const mapLink =
      order.delivery_latitude != null && order.delivery_longitude != null
        ? `https://maps.google.com/?q=${order.delivery_latitude},${order.delivery_longitude}`
        : null;

    return [
      order.delivery_address,
      order.delivery_area,
      order.delivery_city,
      order.delivery_pincode,
      order.delivery_landmark,
      mapLink,
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
    deliveryCharge:
      order.delivery_charge == null || order.delivery_charge === ""
        ? null
        : Number(order.delivery_charge),
    deliveryDistanceKm: null,
    total: Number(order.total),
    paymentMethod: order.payment_method,
    paymentStatus: paymentStatus(order.payment_method ?? "", order.status),
    status: order.status,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    preparationLabel:
      getPreparationEstimate(order.preparation_time_minutes)?.label ?? null,
    orderSource: order.order_source ?? null,
    specialRequests: order.special_requests?.trim() || null,
    deliveryInstructions: order.delivery_instructions?.trim() || null,
    items: (order.order_items ?? []).map((item) => ({
      id: item.id,
      name: item.item_name,
      format: item.item_format?.trim() || null,
      protein: (() => {
        const unpacked = unpackWaiterSelection(item.selected_protein);
        const soupsBowls = decodeSoupsBowlsSelection(unpacked.selectedProtein);

        if (soupsBowls) return formatSoupsBowlsChoice(soupsBowls);

        const hidden =
          decodeDessertSelection(unpacked.selectedProtein) ||
          decodeSoupSelection(unpacked.selectedProtein);
        const protein = hidden ? null : unpacked.selectedProtein;

        return [unpacked.selectedSize, protein].filter(Boolean).join(" · ") || null;
      })(),
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

async function attachDeliveryDistance(orders: StaffOrder[]) {
  if (orders.length === 0) return orders;

  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, delivery_distance_km")
    .in(
      "id",
      orders.map((order) => order.id),
    );

  if (error || !data) return orders;

  const distances = new Map(
    data.map((row) => [row.id as number, row.delivery_distance_km as number | null]),
  );

  return orders.map((order) => {
    const distanceKm = distances.get(order.id);

    return {
      ...order,
      deliveryDistanceKm:
        typeof distanceKm === "number" && Number.isFinite(distanceKm) ? distanceKm : null,
    };
  });
}

export async function listActiveStaffOrders() {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(ORDER_COLUMNS)
    .in("status", ACTIVE_STATUSES)
    .or("order_source.is.null,order_source.not.in.(awaiting_payment,payment_failed)")
    .not("area", "is", null)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) throw error;

  return attachDeliveryDistance(((data ?? []) as OrderRow[]).map(mapOrder));
}

export async function getActiveStaffOrder(orderId: number) {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("id", orderId)
    .in("status", ACTIVE_STATUSES)
    .or("order_source.is.null,order_source.not.in.(awaiting_payment,payment_failed)")
    .not("area", "is", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const [order] = await attachDeliveryDistance([mapOrder(data as OrderRow)]);

  return order ?? null;
}
