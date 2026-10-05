import { NextResponse } from "next/server";
import {
  getSupabaseAdminClient,
  getSupabaseAdminConfig,
} from "@lib/getSupabaseAdmin";
import {
  getMorningOpenLabel,
  getNightCloseLabel,
  getOrderWindow,
} from "@lib/orderCutoff";
import {
  isValidIndianMobile,
  normalizeIndianPhone,
} from "@lib/normalizePhone";
import { getCartItemCustomization } from "@lib/fitarritoHouseMenu";
import { getDeliveryArea, getDeliveryAreaById } from "@lib/deliveryAreas";
import { calculateOrderTotals } from "@lib/orderTotals";
import { repriceCartRows } from "@lib/pricedCart";
import type { CartItemRecord } from "@lib/cartItemsServer";
import {
  getRazorpayConfig,
  getRazorpayConfigDiagnostics,
  razorpayConfigurationError,
  verifyRazorpayPayment,
} from "@lib/razorpay";

export const dynamic = "force-dynamic";

function normalizePaymentMethod(value: unknown) {
  const method = String(value ?? "razorpay").trim().toLowerCase();

  if (method === "cash" || method === "qr" || method === "razorpay") {
    return method;
  }

  return "razorpay";
}

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
      deliveryAddressType,
      locationId,
      addressLine1,
      area,
      city,
      pincode,
      landmark,
      deliveryInstructions,
      paymentMethod = "razorpay",
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
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

    const addressType =
      deliveryAddressType === "normal_address"
        ? "normal_address"
        : "selected_location";
    const selectedArea =
      addressType === "selected_location"
        ? getDeliveryAreaById(String(locationId ?? "")) ??
          getDeliveryArea(String(area ?? "").trim())
        : undefined;

    if (addressType === "selected_location" && !selectedArea) {
      return NextResponse.json(
        { error: "Please select a valid delivery location." },
        { status: 400 },
      );
    }

    const customAddress = String(addressLine1 ?? "").trim();
    const customArea = String(area ?? "").trim();
    const customCity = String(city ?? "").trim();
    const customPincode = String(pincode ?? "").trim();
    const customLandmark = String(landmark ?? "").trim();

    if (
      addressType === "normal_address" &&
      (!customAddress || !customArea || !customCity || !customPincode)
    ) {
      return NextResponse.json(
        { error: "Please enter your delivery address." },
        { status: 400 },
      );
    }

    const deliveryLocation =
      addressType === "selected_location"
        ? selectedArea!.name
        : [customAddress, customArea, customCity, customPincode, customLandmark]
            .filter(Boolean)
            .join(", ");

    if (getOrderWindow() === "closed") {
      return NextResponse.json(
        {
          error: `Ordering is closed from ${getNightCloseLabel()} to ${getMorningOpenLabel()}. Please place your order after ${getMorningOpenLabel()}.`,
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

    const pricedItems = await repriceCartRows(cartItems as CartItemRecord[]);
    const subtotal = pricedItems.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0,
    );

    const deliveryCharge = 0;
    const totals = calculateOrderTotals(subtotal, deliveryCharge);
    const total = totals.total;
    const storedPaymentMethod = normalizePaymentMethod(paymentMethod);

    if (storedPaymentMethod === "razorpay") {
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

      if (!getRazorpayConfig()) {
        return NextResponse.json(
          {
            error: razorpayConfigurationError(),
            missing: getRazorpayConfigDiagnostics().missing,
          },
          { status: 503 },
        );
      }

      try {
        const paymentVerification = await verifyRazorpayPayment({
          orderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
          signature: razorpaySignature,
          expectedAmountPaise: totals.customerPaise,
        });

        if (!paymentVerification.verified) {
          console.error(
            `Razorpay payment validation failed for cart ${sessionId}: ${paymentVerification.reason}`,
          );

          return NextResponse.json(
            { error: "Payment could not be verified for this order." },
            { status: 400 },
          );
        }
      } catch (error) {
        console.error(
          `Razorpay payment lookup failed for cart ${sessionId}:`,
          error,
        );

        return NextResponse.json(
          { error: "Unable to verify payment with Razorpay." },
          { status: 502 },
        );
      }
    }

    const orderPayload = {
      session_id: sessionId,
      customer_name: customerName.trim(),
      customer_phone: normalizedPhone,
      area: deliveryLocation,
      delivery_address_type: addressType,
      delivery_location_id:
        addressType === "selected_location" ? selectedArea!.id : null,
      delivery_location_name:
        addressType === "selected_location" ? selectedArea!.name : null,
      delivery_address:
        addressType === "normal_address" ? customAddress : null,
      delivery_area:
        addressType === "selected_location" ? selectedArea!.name : customArea,
      delivery_city:
        addressType === "selected_location" ? "Chennai" : customCity,
      delivery_pincode:
        addressType === "selected_location"
          ? selectedArea!.pincode
          : customPincode,
      delivery_landmark:
        addressType === "normal_address" && customLandmark
          ? customLandmark
          : null,
      delivery_instructions: deliveryInstructions?.trim() || null,
      subtotal,
      delivery_charge: deliveryCharge,
      total,
      status: "pending",
      whatsapp_status: "pending",
    };

    let { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        ...orderPayload,
        payment_method: storedPaymentMethod,
      })
      .select()
      .single();

    // Live DB currently checks payment_method IN ('cash', 'qr').
    if (orderError?.code === "23514" && storedPaymentMethod === "razorpay") {
      console.warn(
        'orders.payment_method check rejected "razorpay". Saving as "qr" until the Razorpay constraint migration is applied.',
      );

      ({ data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
          ...orderPayload,
          payment_method: "qr",
        })
        .select()
        .single());
    }

    if (orderError || !order) {
      console.error("Order creation error:", orderError);

      return NextResponse.json(
        { error: "Unable to create order." },
        { status: 500 },
      );
    }

    const orderItems = pricedItems.map((item) => {
      const customization = getCartItemCustomization({
        title: item.title,
        selected_protein: item.selected_protein,
        selected_size: item.selected_size,
      });
      const proteinDetails = [
        customization.protein,
        customization.toppings ? `Toppings: ${customization.toppings}` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      return {
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        item_name: customization.title,
        selected_protein: proteinDetails || item.selected_protein,
        base_price: Number(item.base_price ?? 0),
        protein_price: Number(item.protein_price ?? 0),
        unit_price: Number(item.price),
        quantity: Number(item.quantity),
      };
    });

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

    console.log(`Order ${order.id} saved successfully`);

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
