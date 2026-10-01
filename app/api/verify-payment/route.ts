import { NextResponse } from "next/server";
import {
  getRazorpayConfig,
  verifyRazorpayPaymentSignature,
} from "@lib/razorpay";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const config = getRazorpayConfig();

  if (!config) {
    return NextResponse.json(
      {
        error:
          "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const razorpayOrderId = body.razorpay_order_id;
    const razorpayPaymentId = body.razorpay_payment_id;
    const razorpaySignature = body.razorpay_signature;

    if (
      typeof razorpayOrderId !== "string" ||
      !razorpayOrderId ||
      typeof razorpayPaymentId !== "string" ||
      !razorpayPaymentId ||
      typeof razorpaySignature !== "string" ||
      !razorpaySignature
    ) {
      return NextResponse.json(
        { success: false, error: "Missing payment verification fields." },
        { status: 400 },
      );
    }

    if (
      !verifyRazorpayPaymentSignature({
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature,
      })
    ) {
      return NextResponse.json(
        { success: false, error: "Payment signature mismatch." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Verify Razorpay payment error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to verify payment." },
      { status: 500 },
    );
  }
}
