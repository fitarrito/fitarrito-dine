import { NextResponse } from "next/server";
import { DeliveryQuoteError } from "@lib/googleDelivery";
import {
  getSupabaseAdminClient,
  getSupabaseAdminConfig,
} from "@lib/getSupabaseAdmin";
import { prepareCheckoutOrder } from "@lib/prepareCheckoutOrder";
import { confirmRestaurantPayment, RestaurantOrderError } from "@lib/restaurantOrder";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof RestaurantOrderError || error instanceof DeliveryQuoteError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("Place order error:", error);

  return NextResponse.json(
    { error: "Something went wrong while placing your order." },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const razorpayOrderId = body.razorpayOrderId;
    const razorpayPaymentId = body.razorpayPaymentId;
    const razorpaySignature = body.razorpaySignature;
    const confirming =
      typeof razorpayOrderId === "string" &&
      razorpayOrderId &&
      typeof razorpayPaymentId === "string" &&
      razorpayPaymentId &&
      typeof razorpaySignature === "string" &&
      razorpaySignature;

    if (confirming) {
      if (!getSupabaseAdminConfig()) {
        return NextResponse.json(
          { error: "Supabase admin is not configured." },
          { status: 503 },
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
    }

    const prepared = await prepareCheckoutOrder(body);

    return NextResponse.json(prepared);
  } catch (error) {
    return errorResponse(error);
  }
}
