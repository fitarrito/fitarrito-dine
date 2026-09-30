import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function readValue(
  source: FormData | URLSearchParams,
  key: string,
) {
  const value = source.get(key);

  return typeof value === "string" ? value : "";
}

function paymentReturnUrl(request: Request, source: FormData | URLSearchParams) {
  const origin = new URL(request.url).origin;
  const params = new URLSearchParams();
  const paymentId = readValue(source, "razorpay_payment_id");
  const orderId = readValue(source, "razorpay_order_id");
  const signature = readValue(source, "razorpay_signature");
  const errorDescription =
    readValue(source, "error[description]") ||
    readValue(source, "error_description");
  const errorReason =
    readValue(source, "error[reason]") || readValue(source, "error_reason");

  if (paymentId) params.set("razorpay_payment_id", paymentId);
  if (orderId) params.set("razorpay_order_id", orderId);
  if (signature) params.set("razorpay_signature", signature);
  if (errorDescription) params.set("payment_error", errorDescription);
  if (errorReason) params.set("payment_reason", errorReason);

  return `${origin}/checkout/payment?${params.toString()}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  return NextResponse.redirect(paymentReturnUrl(request, url.searchParams), 303);
}

export async function POST(request: Request) {
  const form = await request.formData();

  return NextResponse.redirect(paymentReturnUrl(request, form), 303);
}
