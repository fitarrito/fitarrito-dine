import { NextResponse } from "next/server";
import {
  getSupabaseAdminClient,
  getSupabaseAdminConfig,
} from "@lib/getSupabaseAdmin";
import { handleRazorpayWebhook, RestaurantOrderError } from "@lib/restaurantOrder";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!getSupabaseAdminConfig()) {
    return NextResponse.json(
      { error: "Supabase admin is not configured." },
      { status: 503 },
    );
  }

  try {
    const rawBody = await request.text();
    const result = await handleRazorpayWebhook(
      getSupabaseAdminClient(),
      rawBody,
      request.headers.get("x-razorpay-signature"),
    );

    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    if (error instanceof RestaurantOrderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
    }

    console.error("Razorpay webhook error:", error);

    return NextResponse.json(
      { error: "Unable to process the Razorpay webhook." },
      { status: 500 },
    );
  }
}
