import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeliveryQuote } from "@lib/googleDelivery";
import { calculateOrderTotals } from "@lib/orderTotals";
import {
  getRazorpayClient,
  getRazorpayConfig,
  verifyRazorpayPayment,
  verifyRazorpayWebhookSignature,
} from "@lib/razorpay";

export const AWAITING_PAYMENT_SOURCE = "awaiting_payment";
export const FAILED_PAYMENT_SOURCE = "payment_failed";
const PAID_ORDER_SOURCE = "website";
const UNPAID_SOURCES = [AWAITING_PAYMENT_SOURCE, FAILED_PAYMENT_SOURCE];

export class RestaurantOrderError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "RestaurantOrderError";
    this.status = status;
  }
}

export type ReservedOrderItem = {
  menuItemId: string;
  itemName: string;
  selectedProtein: string | null;
  itemFormat?: string | null;
  servingType?: string | null;
  selectedIngredient?: string | null;
  basePrice: number;
  proteinPrice: number;
  unitPrice: number;
  quantity: number;
};

export type ReserveRestaurantOrderInput = {
  sessionId: string;
  customerName: string;
  customerPhone: string;
  addressLine1: string;
  area: string;
  city: string;
  pincode: string;
  landmark: string;
  deliveryInstructions: string;
  specialRequests: string | null;
  quote: DeliveryQuote;
  items: ReservedOrderItem[];
  subtotal: number;
};

type PaymentStatus = "pending" | "paid" | "failed";

type StoredOrder = {
  id: number;
  session_id: string | null;
  total: number | string;
  order_source: string | null;
  whatsapp_message_id: string | null;
  status: string;
  payment_method: string | null;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  payment_status?: string | null;
};

export type PreparedRestaurantOrder =
  | {
      kind: "payment";
      orderId: number;
      razorpayOrderId: string;
      amount: number;
      currency: "INR";
      keyId: string;
      total: number;
      deliveryCharge: number;
    }
  | {
      kind: "already_paid";
      orderId: number;
      total: number;
    };

let paymentColumnsAvailable: boolean | null = null;
let distanceColumnsAvailable: boolean | null = null;

function paymentReference(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  status: PaymentStatus,
) {
  return `rzp:${razorpayOrderId}:${razorpayPaymentId}:${status}`;
}

function readPaymentReference(value: string | null | undefined) {
  if (!value?.startsWith("rzp:")) return null;

  const [, razorpayOrderId = "", razorpayPaymentId = "", status = ""] = value.split(":");

  if (status !== "pending" && status !== "paid" && status !== "failed") return null;

  return {
    razorpayOrderId: razorpayOrderId || null,
    razorpayPaymentId: razorpayPaymentId || null,
    paymentStatus: status,
  };
}

function storedRazorpayOrderId(order: StoredOrder) {
  return order.razorpay_order_id || readPaymentReference(order.whatsapp_message_id)?.razorpayOrderId || null;
}

function storedRazorpayPaymentId(order: StoredOrder) {
  return order.razorpay_payment_id || readPaymentReference(order.whatsapp_message_id)?.razorpayPaymentId || null;
}

function rupeesToPaise(value: number | string) {
  return Math.round(Number(value) * 100);
}

function missingColumn(error: { code?: string } | null) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

async function hasPaymentColumns(supabase: SupabaseClient) {
  if (paymentColumnsAvailable != null) return paymentColumnsAvailable;

  const { error } = await supabase.from("orders").select("razorpay_order_id").limit(1);

  if (!error) {
    paymentColumnsAvailable = true;
    return true;
  }

  if (missingColumn(error)) {
    paymentColumnsAvailable = false;
    return false;
  }

  throw error;
}

async function hasDistanceColumns(supabase: SupabaseClient) {
  if (distanceColumnsAvailable != null) return distanceColumnsAvailable;

  const { error } = await supabase
    .from("orders")
    .select("delivery_distance_km, restaurant_latitude, restaurant_longitude")
    .limit(1);

  if (!error) {
    distanceColumnsAvailable = true;
    return true;
  }

  if (missingColumn(error)) {
    distanceColumnsAvailable = false;
    return false;
  }

  throw error;
}

const ORDER_COLUMNS =
  "id, session_id, total, order_source, whatsapp_message_id, status, payment_method";
const ORDER_COLUMNS_WITH_PAYMENT =
  `${ORDER_COLUMNS}, razorpay_order_id, razorpay_payment_id, payment_status`;

async function findReusableOrder(supabase: SupabaseClient, sessionId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select((await hasPaymentColumns(supabase)) ? ORDER_COLUMNS_WITH_PAYMENT : ORDER_COLUMNS)
    .eq("session_id", sessionId)
    .eq("status", "pending")
    .in("order_source", UNPAID_SOURCES)
    .order("id", { ascending: false })
    .limit(1);

  if (error) throw error;

  return ((data ?? [])[0] as unknown as StoredOrder | undefined) ?? null;
}

async function findOrderByRazorpayOrderId(supabase: SupabaseClient, razorpayOrderId: string) {
  if (await hasPaymentColumns(supabase)) {
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_COLUMNS_WITH_PAYMENT)
      .eq("razorpay_order_id", razorpayOrderId)
      .order("id", { ascending: false })
      .limit(1);

    if (!error && data?.[0]) return data[0] as unknown as StoredOrder;
    if (error && !missingColumn(error)) throw error;
  }

  const { data, error } = await supabase
    .from("orders")
    .select((await hasPaymentColumns(supabase)) ? ORDER_COLUMNS_WITH_PAYMENT : ORDER_COLUMNS)
    .like("whatsapp_message_id", `rzp:${razorpayOrderId}:%`)
    .order("id", { ascending: false })
    .limit(1);

  if (error) throw error;
  if (data?.[0]) return data[0] as unknown as StoredOrder;

  let notedId = Number.NaN;

  try {
    const razorpayOrder = await getRazorpayClient().orders.fetch(razorpayOrderId);
    const notes = razorpayOrder.notes as { fitarrito_order_id?: string } | undefined;
    notedId = Number(notes?.fitarrito_order_id);
  } catch (lookupError) {
    console.error(`No Razorpay order ${razorpayOrderId} while matching a restaurant order:`, lookupError);
    return null;
  }

  if (!Number.isInteger(notedId)) return null;

  const noted = await supabase
    .from("orders")
    .select((await hasPaymentColumns(supabase)) ? ORDER_COLUMNS_WITH_PAYMENT : ORDER_COLUMNS)
    .eq("id", notedId)
    .maybeSingle();

  if (noted.error) throw noted.error;

  return (noted.data as unknown as StoredOrder | null) ?? null;
}

function orderAddressPayload(input: ReserveRestaurantOrderInput, totals: ReturnType<typeof calculateOrderTotals>) {
  const deliveryLocation = [
    input.addressLine1,
    input.area,
    input.city,
    input.pincode,
    input.landmark,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    session_id: input.sessionId,
    customer_name: input.customerName,
    customer_phone: input.customerPhone,
    area: deliveryLocation,
    delivery_address_type: "normal_address",
    delivery_location_id: null,
    delivery_location_name: null,
    delivery_address: input.addressLine1,
    delivery_area: input.area,
    delivery_city: input.city,
    delivery_pincode: input.pincode,
    delivery_landmark: input.landmark || null,
    delivery_latitude: input.quote.latitude,
    delivery_longitude: input.quote.longitude,
    delivery_instructions: input.deliveryInstructions || null,
    special_requests: input.specialRequests,
    subtotal: input.subtotal,
    delivery_charge: totals.deliveryCharge,
    total: totals.total,
    status: "pending",
    whatsapp_status: "pending",
    updated_at: new Date().toISOString(),
  };
}

async function insertOrder(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
) {
  let result = await supabase
    .from("orders")
    .insert({ ...payload, payment_method: "razorpay" })
    .select("id")
    .single();

  if (result.error?.code === "23514") {
    result = await supabase
      .from("orders")
      .insert({ ...payload, payment_method: "qr" })
      .select("id")
      .single();
  }

  if (result.error || !result.data) {
    console.error("Order reservation failed:", result.error);
    throw new RestaurantOrderError(500, "Unable to create order.");
  }

  return result.data.id as number;
}

async function replaceOrderItems(
  supabase: SupabaseClient,
  orderId: number,
  items: ReservedOrderItem[],
) {
  const { error: deleteError } = await supabase.from("order_items").delete().eq("order_id", orderId);

  if (deleteError) throw deleteError;

  const rows = items.map((item) => ({
    order_id: orderId,
    menu_item_id: item.menuItemId,
    item_name: item.itemName,
    selected_protein: item.selectedProtein,
    item_format: item.itemFormat ?? null,
    serving_type: item.servingType ?? null,
    selected_ingredient: item.selectedIngredient ?? null,
    base_price: item.basePrice,
    protein_price: item.proteinPrice,
    unit_price: item.unitPrice,
    quantity: item.quantity,
  }));
  let { error } = await supabase.from("order_items").insert(rows);

  if (error && /serving_type|selected_ingredient/i.test(error.message ?? "")) {
    const fallback = rows.map(({ serving_type: _serving, selected_ingredient: _ingredient, ...row }) => row);
    const retry = await supabase.from("order_items").insert(fallback);
    error = retry.error;
  }

  if (error) {
    console.error("Order item reservation failed:", error);
    throw new RestaurantOrderError(500, "Unable to save order items.");
  }
}

async function savePaymentReference(
  supabase: SupabaseClient,
  orderId: number,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  status: PaymentStatus,
  orderSource: string,
) {
  const patch: Record<string, unknown> = {
    order_source: orderSource,
    updated_at: new Date().toISOString(),
  };

  if (await hasPaymentColumns(supabase)) {
    patch.razorpay_order_id = razorpayOrderId;
    patch.razorpay_payment_id = razorpayPaymentId || null;
    patch.payment_status = status;
  } else {
    patch.whatsapp_message_id = paymentReference(razorpayOrderId, razorpayPaymentId, status);
  }

  const { error } = await supabase.from("orders").update(patch).eq("id", orderId);

  if (error) {
    console.error(`Unable to save payment reference for order ${orderId}:`, error);
    throw new RestaurantOrderError(500, "Unable to save the payment reference.");
  }
}

async function createRazorpayOrder(orderId: number, amountPaise: number) {
  const config = getRazorpayConfig();

  if (!config) {
    throw new RestaurantOrderError(503, "Razorpay is not configured.");
  }

  const order = await getRazorpayClient().orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: `fit${orderId}t${Date.now().toString(36)}`.slice(0, 40),
    notes: {
      fitarrito_order_id: String(orderId),
      checkout: "fitarrito-dine",
    },
  });

  return { id: order.id, amount: Number(order.amount), currency: "INR" as const, keyId: config.keyId };
}

async function capturedPaymentFor(razorpayOrderId: string) {
  const payments = await getRazorpayClient().orders.fetchPayments(razorpayOrderId);

  return (
    payments.items.find((payment) => payment.status === "captured") ?? null
  );
}

export async function applyCapturedPayment(
  supabase: SupabaseClient,
  order: StoredOrder,
  razorpayPaymentId: string,
) {
  const existingPaymentId = storedRazorpayPaymentId(order);

  if (order.order_source === PAID_ORDER_SOURCE) {
    if (existingPaymentId === razorpayPaymentId) {
      return { orderId: order.id, total: Number(order.total) };
    }

    console.error(
      `Paid order ${order.id} received another payment ${razorpayPaymentId}. Manual reconciliation required.`,
    );
    throw new RestaurantOrderError(
      409,
      "This order is already paid. The extra payment needs to be matched manually.",
    );
  }

  const razorpayOrderId = storedRazorpayOrderId(order);

  if (!razorpayOrderId) {
    throw new RestaurantOrderError(409, "This order has no payment to confirm.");
  }

  const patch: Record<string, unknown> = {
    order_source: PAID_ORDER_SOURCE,
    updated_at: new Date().toISOString(),
  };

  if (await hasPaymentColumns(supabase)) {
    patch.razorpay_order_id = razorpayOrderId;
    patch.razorpay_payment_id = razorpayPaymentId;
    patch.payment_status = "paid";
  } else {
    patch.whatsapp_message_id = paymentReference(razorpayOrderId, razorpayPaymentId, "paid");
  }

  const { data, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", order.id)
    .in("order_source", UNPAID_SOURCES)
    .select("id");

  if (error) {
    console.error(`Unable to mark order ${order.id} paid:`, error);
    throw new RestaurantOrderError(500, "Unable to update the paid order.");
  }

  if (!data?.length) {
    const current = await findOrderByRazorpayOrderId(supabase, razorpayOrderId);

    if (
      current?.order_source === PAID_ORDER_SOURCE &&
      storedRazorpayPaymentId(current) === razorpayPaymentId
    ) {
      return { orderId: order.id, total: Number(order.total) };
    }

    console.error(
      `Paid order ${order.id} received another payment ${razorpayPaymentId}. Manual reconciliation required.`,
    );
    throw new RestaurantOrderError(
      409,
      "This order is already paid. The extra payment needs to be matched manually.",
    );
  }

  if (order.session_id) {
    const { error } = await supabase.from("CartItems").delete().eq("session_id", order.session_id);

    if (error) console.error(`Unable to clear cart for order ${order.id}:`, error);
  }

  return { orderId: order.id, total: Number(order.total) };
}

async function settleCapturedRazorpayOrder(
  supabase: SupabaseClient,
  order: StoredOrder,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  amountPaise: number,
) {
  if (rupeesToPaise(order.total) !== amountPaise) {
    console.error(
      `Payment ${razorpayPaymentId} for Razorpay order ${razorpayOrderId} is ${amountPaise} paise, but reserved order ${order.id} is ${rupeesToPaise(order.total)} paise. Manual reconciliation required.`,
    );
    throw new RestaurantOrderError(
      409,
      "The payment amount does not match this order. Call the restaurant before trying again.",
    );
  }

  return applyCapturedPayment(supabase, order, razorpayPaymentId);
}

export async function reserveRestaurantOrder(
  supabase: SupabaseClient,
  input: ReserveRestaurantOrderInput,
): Promise<PreparedRestaurantOrder> {
  if (input.items.length === 0) {
    throw new RestaurantOrderError(400, "Your cart is empty.");
  }

  const totals = calculateOrderTotals(input.subtotal, input.quote.deliveryCharge);
  const existing = await findReusableOrder(supabase, input.sessionId);
  let razorpayOrderId = existing ? storedRazorpayOrderId(existing) : null;

  if (existing && razorpayOrderId) {
    const razorpayOrder = await getRazorpayClient().orders.fetch(razorpayOrderId);

    if (razorpayOrder.status === "paid") {
      const captured = await capturedPaymentFor(razorpayOrderId);

      if (!captured) {
        throw new RestaurantOrderError(
          409,
          "This checkout was already paid. Call the restaurant before trying again.",
        );
      }

      const settled = await settleCapturedRazorpayOrder(
        supabase,
        existing,
        razorpayOrderId,
        captured.id,
        Number(captured.amount),
      );

      return { kind: "already_paid", orderId: settled.orderId, total: settled.total };
    }

    if (Number(razorpayOrder.amount) !== totals.customerPaise) {
      razorpayOrderId = null;
    }
  }

  const payload = orderAddressPayload(input, totals);

  if (await hasDistanceColumns(supabase)) {
    Object.assign(payload, {
      delivery_distance_km: input.quote.distanceKm,
      restaurant_latitude: input.quote.originLatitude,
      restaurant_longitude: input.quote.originLongitude,
    });
  }

  let orderId = existing?.id ?? null;
  let createdOrder = false;

  if (orderId) {
    const { error } = await supabase.from("orders").update({
      ...payload,
      order_source: AWAITING_PAYMENT_SOURCE,
    }).eq("id", orderId);

    if (error) {
      console.error("Order update failed:", error);
      throw new RestaurantOrderError(500, "Unable to update the reserved order.");
    }
  } else {
    orderId = await insertOrder(supabase, {
      ...payload,
      order_source: AWAITING_PAYMENT_SOURCE,
    });
    createdOrder = true;
  }

  try {
    await replaceOrderItems(supabase, orderId, input.items);
  } catch (error) {
    if (createdOrder) {
      await supabase.from("orders").delete().eq("id", orderId);
    }

    throw error;
  }

  if (!razorpayOrderId) {
    const created = await createRazorpayOrder(orderId, totals.customerPaise);
    razorpayOrderId = created.id;
  }

  await savePaymentReference(
    supabase,
    orderId,
    razorpayOrderId,
    "",
    "pending",
    AWAITING_PAYMENT_SOURCE,
  );

  const config = getRazorpayConfig();

  if (!config) {
    throw new RestaurantOrderError(503, "Razorpay is not configured.");
  }

  return {
    kind: "payment",
    orderId,
    razorpayOrderId,
    amount: totals.customerPaise,
    currency: "INR",
    keyId: config.keyId,
    total: totals.total,
    deliveryCharge: totals.deliveryCharge,
  };
}

export async function confirmRestaurantPayment(
  supabase: SupabaseClient,
  input: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  },
) {
  const order = await findOrderByRazorpayOrderId(supabase, input.razorpayOrderId);

  if (!order) {
    console.error(
      `Captured-payment confirmation could not find a reserved order for ${input.razorpayOrderId}. Manual reconciliation required.`,
    );
    throw new RestaurantOrderError(
      404,
      "Payment was received, but the reserved order could not be found. Call the restaurant with your payment reference.",
    );
  }

  const existingPaymentId = storedRazorpayPaymentId(order);

  if (order.order_source === PAID_ORDER_SOURCE && existingPaymentId === input.razorpayPaymentId) {
    return { orderId: order.id, total: Number(order.total) };
  }

  let verified = false;

  try {
    const verification = await verifyRazorpayPayment({
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
      expectedAmountPaise: rupeesToPaise(order.total),
    });
    verified = verification.verified;

    if (!verification.verified) {
      console.error(
        `Razorpay confirmation failed for order ${order.id}: ${verification.reason}`,
      );
    }
  } catch (error) {
    console.error(`Razorpay confirmation lookup failed for order ${order.id}:`, error);
    throw new RestaurantOrderError(502, "Unable to verify payment with Razorpay.");
  }

  if (!verified) {
    throw new RestaurantOrderError(400, "Payment could not be verified for this order.");
  }

  return applyCapturedPayment(supabase, order, input.razorpayPaymentId);
}

export async function recordPaymentFailure(supabase: SupabaseClient, razorpayOrderId: string) {
  const order = await findOrderByRazorpayOrderId(supabase, razorpayOrderId);

  if (!order || order.order_source === PAID_ORDER_SOURCE) return null;

  const paymentId = storedRazorpayPaymentId(order) ?? "";
  await savePaymentReference(
    supabase,
    order.id,
    razorpayOrderId,
    paymentId,
    "failed",
    FAILED_PAYMENT_SOURCE,
  );

  return order.id;
}

type RazorpayWebhookPayment = {
  id?: string;
  order_id?: string;
  amount?: number;
  status?: string;
};

export async function handleRazorpayWebhook(
  supabase: SupabaseClient,
  rawBody: string,
  signature: string | null,
) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET?.trim()) {
    throw new RestaurantOrderError(503, "Razorpay webhook secret is not configured.");
  }

  if (!signature || !verifyRazorpayWebhookSignature(rawBody, signature)) {
    throw new RestaurantOrderError(400, "Invalid Razorpay webhook signature.");
  }

  const event = JSON.parse(rawBody) as {
    event?: string;
    payload?: { payment?: { entity?: RazorpayWebhookPayment } };
  };
  const payment = event.payload?.payment?.entity;
  const razorpayOrderId = payment?.order_id || "";
  const razorpayPaymentId = payment?.id || "";

  if (!razorpayOrderId || !razorpayPaymentId) {
    return { matched: false };
  }

  if (event.event === "payment.failed") {
    const orderId = await recordPaymentFailure(supabase, razorpayOrderId);
    return { matched: Boolean(orderId), orderId };
  }

  if (event.event !== "payment.captured") {
    return { matched: false };
  }

  const order = await findOrderByRazorpayOrderId(supabase, razorpayOrderId);

  if (!order) {
    console.error(
      `Webhook payment ${razorpayPaymentId} has no reserved order. Manual reconciliation required.`,
    );
    return { matched: false };
  }

  const fetched = await getRazorpayClient().payments.fetch(razorpayPaymentId);

  if (fetched.status !== "captured" || fetched.order_id !== razorpayOrderId) {
    throw new RestaurantOrderError(409, "Webhook payment is not a captured payment for this order.");
  }

  const settled = await settleCapturedRazorpayOrder(
    supabase,
    order,
    razorpayOrderId,
    razorpayPaymentId,
    Number(fetched.amount),
  );

  return { matched: true, orderId: settled.orderId };
}
