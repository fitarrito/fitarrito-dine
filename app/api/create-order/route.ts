import { NextResponse } from "next/server";
import {
  getSupabaseAdminClient,
  getSupabaseAdminConfig,
} from "@lib/getSupabaseAdmin";
import {
  getRazorpayClient,
  getRazorpayConfig,
  getRazorpayError,
  isValidAmountPaise,
  parseAmountPaise,
  rupeesToPaise,
} from "@lib/razorpay";

export const dynamic = "force-dynamic";

function sanitizeReceipt(value: unknown, fallback: string) {
  const raw = typeof value === "string" ? value : fallback;

  return raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || fallback.slice(0, 40);
}

async function resolveAmountPaise(body: {
  amount?: unknown;
  sessionId?: unknown;
}) {
  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId.trim() : "";

  if (sessionId && getSupabaseAdminConfig()) {
    const supabaseAdmin = getSupabaseAdminClient();
    const { data: cartItems, error } = await supabaseAdmin
      .from("CartItems")
      .select("price, quantity")
      .eq("session_id", sessionId);

    if (error) {
      throw error;
    }

    if (!cartItems || cartItems.length === 0) {
      return { error: "Your cart is empty.", status: 400 as const };
    }

    const rupees = cartItems.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0,
    );

    return { amount: rupeesToPaise(rupees) };
  }

  const amount = parseAmountPaise(body.amount);

  if (amount === null) {
    return { error: "Amount is required.", status: 400 as const };
  }

  return { amount };
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
    const resolved = await resolveAmountPaise(body);

    if ("error" in resolved) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status },
      );
    }

    const amount = resolved.amount;

    if (!isValidAmountPaise(amount)) {
      return NextResponse.json(
        { error: "Amount must be at least 100 paise." },
        { status: 400 },
      );
    }

    const currency =
      typeof body.currency === "string" && body.currency.trim()
        ? body.currency.trim().toUpperCase()
        : "INR";
    const receipt = sanitizeReceipt(
      body.receipt,
      `fit_${Date.now().toString(36)}`,
    );

    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
    });

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    const razorpayError = getRazorpayError(error);

    if (razorpayError.statusCode === 401) {
      return NextResponse.json(
        { error: razorpayError.description || "Razorpay authentication failed." },
        { status: 401 },
      );
    }

    console.error("Create Razorpay order error:", error);

    return NextResponse.json(
      { error: razorpayError.description || "Unable to create payment order." },
      { status: 500 },
    );
  }
}
