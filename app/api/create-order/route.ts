import { NextResponse } from "next/server";
import {
  getSupabaseAdminClient,
  getSupabaseAdminConfig,
} from "@lib/getSupabaseAdmin";
import {
  getRazorpayClient,
  getRazorpayConfig,
  getRazorpayConfigDiagnostics,
  getRazorpayError,
  isValidAmountPaise,
  logRazorpayConfig,
  parseAmountPaise,
  razorpayConfigurationError,
} from "@lib/razorpay";
import { calculateOrderTotals } from "@lib/orderTotals";
import { repriceCartRows } from "@lib/pricedCart";
import type { CartItemRecord } from "@lib/cartItemsServer";

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
      .select("*")
      .eq("session_id", sessionId);

    if (error) {
      throw error;
    }

    if (!cartItems || cartItems.length === 0) {
      return { error: "Your cart is empty.", status: 400 as const };
    }

    const pricedItems = await repriceCartRows(cartItems as CartItemRecord[]);
    const rupees = pricedItems.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0,
    );

    return { amount: calculateOrderTotals(rupees).customerPaise };
  }

  const amount = parseAmountPaise(body.amount);

  if (amount === null) {
    return { error: "Amount is required.", status: 400 as const };
  }

  return {
    amount: calculateOrderTotals(amount / 100).customerPaise,
  };
}

export async function POST(request: Request) {
  const config = getRazorpayConfig();

  if (!config) {
    const diagnostics = getRazorpayConfigDiagnostics();

    return NextResponse.json(
      {
        error: razorpayConfigurationError(),
        missing: diagnostics.missing,
      },
      { status: 503 },
    );
  }

  const diagnostics = getRazorpayConfigDiagnostics();

  if (!diagnostics.modesMatch) {
    logRazorpayConfig("server and public key modes differ");
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
      key_id: config.keyId,
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
