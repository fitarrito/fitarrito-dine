import { fetchJson } from "@lib/apiFetch";

export type PlaceRestaurantOrderInput = {
  sessionId: string;
  customerName: string;
  customerPhone: string;
  addressLine1: string;
  area: string;
  city: string;
  pincode: string;
  landmark?: string;
  deliveryInstructions?: string;
  paymentMethod: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
};

export type PlaceRestaurantOrderResult = {
  success: boolean;
  orderId: string;
  total: number;
  message: string;
};

export function placeRestaurantOrder(input: PlaceRestaurantOrderInput) {
  return fetchJson<PlaceRestaurantOrderResult>("/api/orders/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
