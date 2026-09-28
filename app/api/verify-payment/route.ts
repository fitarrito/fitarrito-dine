import crypto from "crypto";
import { NextResponse } from "next/server";
import { getRazorpayConfig } from "@lib/razorpay";

export const dynamic = "force-dynamic";

function signaturesMatch(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

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

    const expectedSignature = crypto
      .createHmac("sha256", config.keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (!signaturesMatch(expectedSignature, razorpaySignature)) {
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
