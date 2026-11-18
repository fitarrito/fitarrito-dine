import "server-only";

import type { CartItemRecord } from "@lib/cartItemsServer";
import { decodeDessertSelection } from "@lib/desserts";
import { getCartItemCustomization } from "@lib/fitarritoHouseMenu";
import {
  getSupabaseAdminClient,
  getSupabaseAdminConfig,
} from "@lib/getSupabaseAdmin";
import { readSpecialRequests } from "@lib/specialRequests";
import { quoteDeliveryAddress, readDeliveryAddress } from "@lib/googleDelivery";
import {
  isValidIndianMobile,
  normalizeIndianPhone,
} from "@lib/normalizePhone";
import { unavailableCartMessage } from "@lib/menuVisibility";
import { repriceCartRows } from "@lib/pricedCart";
import {
  reserveRestaurantOrder,
  RestaurantOrderError,
} from "@lib/restaurantOrder";
import { decodeSoupSelection } from "@lib/soups";
import { decodeSoupsBowlsSelection } from "@lib/soupsBowlsOrder";
import { onlineOrderingBlock } from "@lib/storeOrdering";

export async function prepareCheckoutOrder(body: Record<string, unknown>) {
  const orderingBlock = await onlineOrderingBlock();

  if (orderingBlock) {
    throw new RestaurantOrderError(orderingBlock.status, orderingBlock.error);
  }

  if (!getSupabaseAdminConfig()) {
    throw new RestaurantOrderError(503, "Supabase admin is not configured.");
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";

  if (!sessionId) {
    throw new RestaurantOrderError(400, "Cart session is required.");
  }

  const customerName = String(body.customerName ?? "").trim();

  if (!customerName) {
    throw new RestaurantOrderError(400, "Please enter your name.");
  }

  const customerPhone = normalizeIndianPhone(String(body.customerPhone ?? ""));

  if (!isValidIndianMobile(customerPhone)) {
    throw new RestaurantOrderError(400, "Please enter a valid 10-digit mobile number.");
  }

  const address = readDeliveryAddress(body);
  const parsedRequests = readSpecialRequests(
    body.special_requests ?? body.specialRequests,
  );

  if ("error" in parsedRequests) {
    throw new RestaurantOrderError(400, parsedRequests.error);
  }

  const quote = await quoteDeliveryAddress(address);
  const supabase = getSupabaseAdminClient();
  const { data: cartItems, error: cartError } = await supabase
    .from("CartItems")
    .select("*")
    .eq("session_id", sessionId);

  if (cartError) {
    console.error(cartError);
    throw new RestaurantOrderError(500, "Unable to load cart.");
  }

  if (!cartItems || cartItems.length === 0) {
    throw new RestaurantOrderError(400, "Your cart is empty.");
  }

  const pricedItems = await repriceCartRows(cartItems as CartItemRecord[]);
  const unavailableItems = pricedItems.filter((item) => item.is_available === false);

  if (unavailableItems.length > 0) {
    throw new RestaurantOrderError(409, unavailableCartMessage(unavailableItems));
  }
  const subtotal = pricedItems.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0,
  );
  const items = pricedItems.map((item) => {
    const soupsBowls = decodeSoupsBowlsSelection(item.selected_protein);
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
    const selectedProtein =
      proteinDetails ||
      (decodeDessertSelection(item.selected_protein) ||
      decodeSoupSelection(item.selected_protein)
        ? ""
        : item.selected_protein || "");

    return {
      menuItemId: String(item.menu_item_id),
      itemName: customization.title,
      selectedProtein: soupsBowls ? (item.selected_protein ?? selectedProtein) : selectedProtein,
      servingType: soupsBowls?.serving ?? null,
      selectedIngredient: soupsBowls?.ingredient ?? null,
      basePrice: Number(item.base_price ?? 0),
      proteinPrice: Number(item.protein_price ?? 0),
      unitPrice: Number(item.price),
      quantity: Number(item.quantity),
    };
  });

  return reserveRestaurantOrder(supabase, {
    sessionId,
    customerName,
    customerPhone,
    addressLine1: address.addressLine1,
    area: address.area,
    city: address.city,
    pincode: address.pincode,
    landmark: address.landmark,
    deliveryInstructions: String(body.deliveryInstructions ?? "").trim(),
    specialRequests: parsedRequests.specialRequests,
    quote,
    items,
    subtotal,
  });
}
