import { NextResponse } from "next/server";
import { withTimeout } from "@lib/getSupabaseServer";
import {
  getSupabaseAdminClient,
  getSupabaseAdminConfig,
} from "@lib/getSupabaseAdmin";
import { type CartItemRecord } from "@lib/cartItemsServer";
import { repriceCartRows } from "@lib/pricedCart";
import { calculateMenuItemPricing, findSizeVariant } from "@lib/menuPricing";
import { quoteStoredPanAsianSelection } from "@lib/panAsianCatalog";
import { isPanAsianCuisine } from "@lib/panAsianOrder";
import { getProteinNameForPricing } from "@lib/fitarritoHouseMenu";
import type { menuItem, ProteinVariant } from "@/types/types";
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
          "id, title, price, imageUrl, proteinVariants, sizeVariants, order_type, cuisine",
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

    const proteinVariants = Array.isArray(menuItemRow.proteinVariants)
      ? (menuItemRow.proteinVariants as ProteinVariant[])
      : [];

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

    const panAsian = isPanAsianCuisine(menuItemRow.cuisine);
    let pricing: {
      base_price: number;
      protein_price: number;
      price: number;
    };
    let storedProtein = selectedProtein;

    if (panAsian) {
      const quote = await quoteStoredPanAsianSelection(
        menuItemRow.title,
        String(selectedProtein),
      );

      if ("error" in quote) {
        return NextResponse.json({ error: quote.error }, { status: 400 });
      }

      pricing = quote;
      storedProtein = quote.selection;
    } else {
      const proteinName = getProteinNameForPricing(selectedProtein) ?? selectedProtein;
      const protein = proteinVariants.find(
        (item) =>
          item.name === proteinName &&
          item.name.toLowerCase() !== "mutton",
      );

      if (!protein) {
        return NextResponse.json(
          {
            error: `Protein "${proteinName}" is not available for this item.`,
          },
          { status: 400 },
        );
      }

      pricing = calculateMenuItemPricing(
        menuItemRow as menuItem,
        selectedProtein,
        selectedSize,
      );
    }
    const { base_price: basePrice, protein_price: proteinPrice, price: unitPrice } =
      pricing;

    let existingQuery = supabaseAdmin
      .from("CartItems")
      .select("id, quantity")
      .eq("session_id", sessionId)
      .eq("menu_item_id", String(menuItemRow.id))
      .eq("selected_protein", storedProtein);

    if (selectedSize) {
      existingQuery = existingQuery.eq("selected_size", selectedSize);
    }

    const { data: existingItem, error: existingError } = await existingQuery.maybeSingle();

    if (existingError) {
      const missingSizeColumn = /selected_size/i.test(existingError.message ?? "");

      if (!missingSizeColumn) {
        console.error("Existing cart lookup error:", existingError);

        return NextResponse.json(
          { error: "Unable to check cart." },
          { status: 500 },
        );
      }
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
