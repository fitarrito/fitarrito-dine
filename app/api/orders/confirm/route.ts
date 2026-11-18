import { NextResponse } from "next/server";
import {
  getSupabaseAdminClient,
  getSupabaseAdminConfig,
} from "@lib/getSupabaseAdmin";
import { confirmRestaurantPayment, RestaurantOrderError } from "@lib/restaurantOrder";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!getSupabaseAdminConfig()) {
    return NextResponse.json(
      { error: "Supabase admin is not configured." },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const razorpayOrderId = body.razorpayOrderId ?? body.razorpay_order_id;
    const razorpayPaymentId = body.razorpayPaymentId ?? body.razorpay_payment_id;
    const razorpaySignature = body.razorpaySignature ?? body.razorpay_signature;

    if (
      typeof razorpayOrderId !== "string" ||
      !razorpayOrderId ||
      typeof razorpayPaymentId !== "string" ||
      !razorpayPaymentId ||
      typeof razorpaySignature !== "string" ||
      !razorpaySignature
    ) {
      return NextResponse.json(
        { error: "Verified Razorpay payment details are required." },
        { status: 400 },
      );
    }

    const confirmed = await confirmRestaurantPayment(getSupabaseAdminClient(), {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    return NextResponse.json({
      success: true,
      orderId: confirmed.orderId,
      total: confirmed.total,
      message: "Order placed successfully.",
    });
  } catch (error) {
    if (error instanceof RestaurantOrderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Confirm order error:", error);

    return NextResponse.json(
      { error: "Something went wrong while confirming your order." },
      { status: 500 },
    );
  }
}
