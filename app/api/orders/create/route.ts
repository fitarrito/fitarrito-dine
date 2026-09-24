import { NextResponse } from "next/server";
import {
  getSupabaseAdminClient,
  getSupabaseAdminConfig,
} from "@lib/getSupabaseAdmin";
import { getOrderWindow } from "@lib/orderCutoff";
import {
  isValidIndianMobile,
  normalizeIndianPhone,
} from "@lib/normalizePhone";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!getSupabaseAdminConfig()) {
    return NextResponse.json(
      {
        error:
          "Supabase admin is not configured. Add SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();

    const {
      sessionId,
      customerName,
      customerPhone,
      addressLine1,
      area,
      city,
      pincode,
      landmark,
      deliveryInstructions,
      paymentMethod = "cash",
    } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Cart session is required." },
        { status: 400 },
      );
    }

    if (!customerName?.trim()) {
      return NextResponse.json(
        { error: "Please enter your name." },
        { status: 400 },
      );
    }

    if (!customerPhone?.trim()) {
      return NextResponse.json(
        { error: "Please enter your mobile number." },
        { status: 400 },
      );
    }

    const normalizedPhone = normalizeIndianPhone(customerPhone);

    if (!isValidIndianMobile(normalizedPhone)) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit mobile number." },
        { status: 400 },
      );
    }

    if (!addressLine1?.trim()) {
      return NextResponse.json(
        { error: "Please enter your address." },
        { status: 400 },
      );
    }

    if (!area?.trim()) {
      return NextResponse.json(
        { error: "Please enter your area." },
        { status: 400 },
      );
    }

    if (!pincode?.trim()) {
      return NextResponse.json(
        { error: "Please enter your pincode." },
        { status: 400 },
      );
    }

    if (getOrderWindow() === "closed") {
      return NextResponse.json(
        {
          error:
            "Today's on-demand ordering has closed. Please place your order tomorrow.",
        },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();

    const { data: cartItems, error: cartError } = await supabaseAdmin
      .from("CartItems")
      .select("*")
      .eq("session_id", sessionId);

    if (cartError) {
      console.error(cartError);

      return NextResponse.json(
        { error: "Unable to load cart." },
        { status: 500 },
      );
    }

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { error: "Your cart is empty." },
        { status: 400 },
      );
    }

    const subtotal = cartItems.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0,
    );

    const deliveryCharge = 0;
    const total = subtotal + deliveryCharge;

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        session_id: sessionId,
        customer_name: customerName.trim(),
        customer_phone: normalizedPhone,
        address_line1: addressLine1.trim(),
        area: area.trim(),
        city: city?.trim() || "Chennai",
        pincode: pincode.trim(),
        landmark: landmark?.trim() || null,
        delivery_instructions: deliveryInstructions?.trim() || null,
        subtotal,
        delivery_charge: deliveryCharge,
        total,
        payment_method: paymentMethod,
        status: "pending",
        whatsapp_status: "pending",
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("Order creation error:", orderError);

      return NextResponse.json(
        { error: "Unable to create order." },
        { status: 500 },
      );
    }

    const orderItems = cartItems.map((item) => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      item_name: item.title,
      selected_protein: item.selected_protein,
      base_price: Number(item.base_price ?? 0),
      protein_price: Number(item.protein_price ?? 0),
      unit_price: Number(item.price),
      quantity: Number(item.quantity),
    }));

    const { error: orderItemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems);

    if (orderItemsError) {
      console.error("Order items error:", orderItemsError);

      await supabaseAdmin.from("orders").delete().eq("id", order.id);

      return NextResponse.json(
        {
          error:
            "Unable to save order items. Please try again or contact support.",
        },
        { status: 500 },
      );
    }

    await supabaseAdmin.from("CartItems").delete().eq("session_id", sessionId);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      total,
      message: "Order placed successfully.",
    });
  } catch (error) {
    console.error("Place order error:", error);

    return NextResponse.json(
      { error: "Something went wrong while placing your order." },
      { status: 500 },
    );
  }
}
