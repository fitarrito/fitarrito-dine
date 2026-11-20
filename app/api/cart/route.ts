import { NextResponse } from "next/server";
import { withTimeout } from "@lib/getSupabaseServer";
import {
  getSupabaseAdminClient,
  getSupabaseAdminConfig,
} from "@lib/getSupabaseAdmin";
import { type CartItemRecord } from "@lib/cartItemsServer";
import { repriceCartRows } from "@lib/pricedCart";
import { findSizeVariant } from "@lib/menuPricing";
import { loadAsianStartersGravyCatalog } from "@lib/asianStartersGravyCatalog";
import { isAsianStartersGravyCuisine } from "@lib/asianStartersGravyOrder";
import { loadPanAsianCatalog } from "@lib/panAsianCatalog";
import { isPanAsianCuisine } from "@lib/panAsianOrder";
import { isSoupsCategoryName } from "@lib/soups";
import { loadSoupsBowlsCatalog } from "@lib/soupsBowlsCatalog";
import { quoteOrderItem } from "@lib/orderQuote";
import { readFormatOptions, resolveItemFormat } from "@lib/menuFormat";
import { isBlockedMenuTitle, isMenuItemAvailable, unavailableCartMessage } from "@lib/menuVisibility";
import type { menuItem } from "@/types/types";
import { onlineOrderingBlock } from "@lib/storeOrdering";

export const dynamic = "force-dynamic";

async function loadCartRows(sessionId: string) {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await withTimeout(
    supabaseAdmin.from("CartItems").select("*").eq("session_id", sessionId),
    10_000,
    "Cart fetch",
  );

  if (error) throw error;

  return (data ?? []) as CartItemRecord[];
}

async function loadEnrichedCart(sessionId: string) {
  return repriceCartRows(await loadCartRows(sessionId));
}

async function pricedCartItem(row: CartItemRecord) {
  const [item] = await repriceCartRows([row]);

  return item;
}

export async function POST(request: Request) {
  const orderingBlock = await onlineOrderingBlock();

  if (orderingBlock) {
    return NextResponse.json(
      { error: orderingBlock.error },
      { status: orderingBlock.status },
    );
  }

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
    const sessionId = body.sessionId ?? body.session_id;
    const menuItemId = body.menuItemId ?? body.menu_item_id;
    const selectedProtein = body.selectedProtein ?? body.selected_protein;
    const selectedSize = body.selectedSize ?? body.selected_size ?? null;
    const submittedFormat = body.itemFormat ?? body.item_format;
    const quantity = body.quantity ?? 1;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required." },
        { status: 400 },
      );
    }

    if (!menuItemId) {
      return NextResponse.json(
        { error: "Menu item is required." },
        { status: 400 },
      );
    }

    if (!selectedProtein) {
      return NextResponse.json(
        { error: "Please select a protein." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json({ error: "Invalid quantity." }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const { data: menuItemRow, error: menuError } = await withTimeout(
      supabaseAdmin
        .from("MenuItem")
        .select(
          "id, title, price, imageUrl, proteinVariants, sizeVariants, order_type, cuisine, categoryId, is_available, formatOptions",
        )
        .eq("id", menuItemId)
        .single(),
      10_000,
      "Menu item fetch",
    );

    if (menuError || !menuItemRow) {
      console.error("Menu item error:", menuError);

      return NextResponse.json(
        { error: "Menu item not found." },
        { status: 404 },
      );
    }

    if (menuItemRow.order_type && menuItemRow.order_type !== "on_demand") {
      return NextResponse.json(
        { error: "This item is not available for on-demand ordering." },
        { status: 400 },
      );
    }

    if (isBlockedMenuTitle(menuItemRow.title)) {
      return NextResponse.json({ error: "This dish is not on the menu." }, { status: 400 });
    }

    if (!isMenuItemAvailable(menuItemRow)) {
      return NextResponse.json(
        { error: unavailableCartMessage([menuItemRow]) },
        { status: 400 },
      );
    }

    const hasSizeVariants =
      Array.isArray(menuItemRow.sizeVariants) &&
      menuItemRow.sizeVariants.length > 0;

    if (hasSizeVariants && !selectedSize) {
      return NextResponse.json(
        { error: "Please select a size." },
        { status: 400 },
      );
    }

    if (
      hasSizeVariants &&
      !findSizeVariant(menuItemRow as menuItem, selectedSize)
    ) {
      return NextResponse.json(
        { error: `Size "${selectedSize}" is not available for this item.` },
        { status: 400 },
      );
    }

    const categoryId = Number(menuItemRow.categoryId);
    let categoryName: string | null = null;

    if (Number.isInteger(categoryId) && categoryId > 0) {
      const { data: categoryRow, error: categoryError } = await withTimeout(
        supabaseAdmin.from("Category").select("name").eq("id", categoryId).maybeSingle(),
        10_000,
        "Category lookup",
      );

      if (categoryError) {
        console.error("Category lookup failed:", {
          menuItemId,
          categoryId,
          message: categoryError.message,
        });

        return NextResponse.json(
          { error: "Unable to price this menu item." },
          { status: 500 },
        );
      }

      categoryName = categoryRow?.name ?? null;
    }

    const panPrices = isPanAsianCuisine(menuItemRow.cuisine)
      ? await loadPanAsianCatalog([String(menuItemRow.title)])
      : { prices: [], ingredients: [] };
    const starterPrices = isAsianStartersGravyCuisine(menuItemRow.cuisine)
      ? await loadAsianStartersGravyCatalog([String(menuItemRow.title)])
      : [];
    const soupsBowlsPrices = isSoupsCategoryName(categoryName)
      ? await loadSoupsBowlsCatalog([String(menuItemRow.title)])
      : [];
    const quote = quoteOrderItem({
      item: menuItemRow as menuItem,
      categoryName,
      selectedProtein,
      selectedSize,
      panAsianPrices: panPrices.prices,
      panAsianIngredients: panPrices.ingredients,
      asianStarterPrices: starterPrices,
      soupsBowlsPrices,
    });

    if ("error" in quote) {
      return NextResponse.json({ error: quote.error }, { status: 400 });
    }

    const resolvedFormat = resolveItemFormat(
      readFormatOptions(menuItemRow.formatOptions),
      submittedFormat,
    );

    if ("error" in resolvedFormat) {
      return NextResponse.json({ error: resolvedFormat.error }, { status: 400 });
    }

    const itemFormat = resolvedFormat.itemFormat;
    const pricing = quote;
    const storedProtein = pricing.selection;
    const { base_price: basePrice, protein_price: proteinPrice, price: unitPrice } =
      pricing;

    const baseMatch = () => {
      let query = supabaseAdmin
        .from("CartItems")
        .select("id, quantity")
        .eq("session_id", sessionId)
        .eq("menu_item_id", String(menuItemRow.id))
        .eq("selected_protein", storedProtein);

      if (selectedSize) query = query.eq("selected_size", selectedSize);

      return query;
    };
    const matchFormat = (
      query: ReturnType<typeof baseMatch>,
      column: "item_format" | "selected_salad",
    ) =>
      itemFormat ? query.eq(column, itemFormat) : query.is(column, null);

    let formatColumn: "item_format" | "selected_salad" = "item_format";
    let existingResult = await matchFormat(baseMatch(), "item_format").maybeSingle();

    if (existingResult.error && /item_format/i.test(existingResult.error.message ?? "")) {
      formatColumn = "selected_salad";
      existingResult = await matchFormat(baseMatch(), "selected_salad").maybeSingle();
    }

    const existingItem = existingResult.data;
    const existingError = existingResult.error;

    if (existingError && !/selected_size/i.test(existingError.message ?? "")) {
      console.error("Existing cart lookup error:", existingError);

      return NextResponse.json(
        { error: "Unable to check cart." },
        { status: 500 },
      );
    }

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

      const { data: updatedItem, error: updateError } = await supabaseAdmin
        .from("CartItems")
        .update({
          quantity: newQuantity,
          title: menuItemRow.title,
          image_url: menuItemRow.imageUrl,
          selected_size: selectedSize,
          ...(formatColumn === "item_format"
            ? { item_format: itemFormat }
            : { selected_salad: itemFormat }),
          base_price: basePrice,
          protein_price: proteinPrice,
          price: unitPrice,
        })
        .eq("id", existingItem.id)
        .select()
        .single();

      if (updateError) {
        console.error("Cart update error:", updateError);

        return NextResponse.json(
          { error: "Unable to update cart." },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Cart updated.",
        item: await pricedCartItem(updatedItem as CartItemRecord),
      });
    }

    const { data: cartItem, error: insertError } = await supabaseAdmin
      .from("CartItems")
      .insert({
        session_id: sessionId,
        menu_item_id: String(menuItemRow.id),
        title: menuItemRow.title,
        image_url: menuItemRow.imageUrl,
        selected_protein: storedProtein,
        selected_size: selectedSize,
        ...(formatColumn === "item_format"
          ? { item_format: itemFormat }
          : { selected_salad: itemFormat }),
        quantity,
        base_price: basePrice,
        protein_price: proteinPrice,
        price: unitPrice,
      })
      .select()
      .single();

    if (insertError) {
      const missingSizeColumn = /selected_size/i.test(insertError.message ?? "");

      if (missingSizeColumn) {
        const { data: fallbackItem, error: fallbackError } = await supabaseAdmin
          .from("CartItems")
          .insert({
            session_id: sessionId,
            menu_item_id: String(menuItemRow.id),
            title: menuItemRow.title,
            image_url: menuItemRow.imageUrl,
            selected_protein: storedProtein,
            ...(formatColumn === "item_format"
              ? { item_format: itemFormat }
              : { selected_salad: itemFormat }),
            quantity,
            base_price: basePrice,
            protein_price: proteinPrice,
            price: unitPrice,
          })
          .select()
          .single();

        if (!fallbackError && fallbackItem) {
          return NextResponse.json({
            success: true,
            message: "Added to cart.",
            item: await pricedCartItem(fallbackItem as CartItemRecord),
          });
        }
      }

      console.error("Cart insert error:", insertError);

      return NextResponse.json(
        { error: "Unable to add item to cart." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Added to cart.",
      item: await pricedCartItem(cartItem as CartItemRecord),
    });
  } catch (error) {
    console.error("Add to cart error:", error);

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  if (!getSupabaseAdminConfig()) {
    return NextResponse.json(
      { error: "Supabase admin is not configured." },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id.trim() : String(body.id ?? "");
    const quantity = Number(body.quantity);

    if (!id || !Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const { data: existingRow, error: existingError } = await supabaseAdmin
      .from("CartItems")
      .select("id, menu_item_id, title")
      .eq("id", id)
      .maybeSingle();

    if (existingError || !existingRow) {
      return NextResponse.json({ error: "Cart item not found." }, { status: 404 });
    }

    const { data: menuItemRow, error: menuError } = await supabaseAdmin
      .from("MenuItem")
      .select("title, is_available")
      .eq("id", existingRow.menu_item_id)
      .maybeSingle();

    if (menuError) throw menuError;

    if (menuItemRow && !isMenuItemAvailable(menuItemRow)) {
      return NextResponse.json(
        { error: unavailableCartMessage([menuItemRow]) },
        { status: 400 },
      );
    }

    const { data: cartRow, error: cartError } = await supabaseAdmin
      .from("CartItems")
      .update({ quantity })
      .eq("id", id)
      .select()
      .single();

    if (cartError || !cartRow) throw cartError;

    return NextResponse.json(await pricedCartItem(cartRow as CartItemRecord));
  } catch (error) {
    console.error("PATCH /api/cart failed:", error);

    return NextResponse.json(
      { error: "Failed to update cart item" },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  if (!getSupabaseAdminConfig()) {
    return NextResponse.json(
      { error: "Supabase admin is not configured." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(req.url);
  const session_id = searchParams.get("session_id") ?? searchParams.get("sessionId");

  if (!session_id) {
    return NextResponse.json(
      { error: "session_id is required" },
      { status: 400 },
    );
  }

  try {
    const cartItems = await loadEnrichedCart(session_id);
    return NextResponse.json(cartItems);
  } catch (error) {
    console.error("GET /api/cart failed:", error);

    return NextResponse.json(
      { error: "Failed to fetch cart" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  if (!getSupabaseAdminConfig()) {
    return NextResponse.json(
      { error: "Supabase admin is not configured." },
      { status: 503 },
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Cart item id required" },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const { error } = await supabaseAdmin.from("CartItems").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("DELETE /api/cart failed:", error);

    return NextResponse.json(
      { error: "Failed to delete cart item" },
      { status: 500 },
    );
  }
}
