import { NextResponse } from "next/server";
import {
  getSupabaseAdminClient,
  getSupabaseAdminConfig,
} from "@lib/getSupabaseAdmin";
import {
  confirmRestaurantPayment,
  recordPaymentFailure,
  RestaurantOrderError,
} from "@lib/restaurantOrder";

export const dynamic = "force-dynamic";

function readValue(source: FormData | URLSearchParams, key: string) {
  const value = source.get(key);

  return typeof value === "string" ? value : "";
}

function redirectTo(request: Request, path: string) {
  const origin = new URL(request.url).origin;

  return NextResponse.redirect(`${origin}${path}`, 303);
}

async function finishPaymentReturn(request: Request, source: FormData | URLSearchParams) {
  const paymentId = readValue(source, "razorpay_payment_id");
  const orderId = readValue(source, "razorpay_order_id");
  const signature = readValue(source, "razorpay_signature");
  const errorDescription =
    readValue(source, "error[description]") ||
    readValue(source, "error_description");
  const errorReason =
    readValue(source, "error[reason]") || readValue(source, "error_reason");

  if (paymentId && orderId && signature && getSupabaseAdminConfig()) {
    try {
      const confirmed = await confirmRestaurantPayment(getSupabaseAdminClient(), {
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      });

      return redirectTo(
        request,
        `/order-success?orderId=${encodeURIComponent(String(confirmed.orderId))}`,
      );
    } catch (error) {
      const message =
        error instanceof RestaurantOrderError
          ? error.message
          : "Payment was received, but the order could not be confirmed.";
      const params = new URLSearchParams({
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        razorpay_signature: signature,
        payment_error: message,
      });

      return redirectTo(request, `/checkout/payment?${params.toString()}`);
    }
  }

  if (orderId && getSupabaseAdminConfig()) {
    try {
      await recordPaymentFailure(getSupabaseAdminClient(), orderId);
    } catch (error) {
      console.error("Unable to record the failed payment:", error);
    }
  }

  const params = new URLSearchParams();

  if (paymentId) params.set("razorpay_payment_id", paymentId);
  if (orderId) params.set("razorpay_order_id", orderId);
  if (signature) params.set("razorpay_signature", signature);
  if (errorDescription) params.set("payment_error", errorDescription);
  if (errorReason) params.set("payment_reason", errorReason);
  if (!errorDescription && !paymentId) {
    params.set("payment_error", "Payment failed. Your reserved order was not charged as paid.");
  }

  return redirectTo(request, `/checkout/payment?${params.toString()}`);
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  return finishPaymentReturn(request, url.searchParams);
}

export async function POST(request: Request) {
  const form = await request.formData();

  return finishPaymentReturn(request, form);
}
