import "server-only";

import type { menuItem } from "@/types/types";
import { getSupabaseAdminClient } from "@lib/getSupabaseAdmin";
import {
  enrichCartItem,
  type CartItemRecord,
  type EnrichedCartItem,
} from "@lib/cartItemsServer";
import { loadAsianStartersGravyCatalog } from "@lib/asianStartersGravyCatalog";
import {
  isAsianStartersGravyCuisine,
  quoteAsianStartersGravySelection,
} from "@lib/asianStartersGravyOrder";
import { loadPanAsianCatalog } from "@lib/panAsianCatalog";
import { isPanAsianCuisine, quotePanAsianSelection } from "@lib/panAsianOrder";
import { isDessertTitle, quoteDessertSelection } from "@lib/desserts";
import { isSoupsCategoryName, quoteSoupSelection } from "@lib/soups";

export async function repriceCartRows(
  rows: CartItemRecord[],
): Promise<EnrichedCartItem[]> {
  if (rows.length === 0) return [];

  const supabaseAdmin = getSupabaseAdminClient();
  const menuItemIds = [...new Set(rows.map((row) => row.menu_item_id))];
  const { data, error } = await supabaseAdmin
    .from("MenuItem")
    .select("*")
    .in("id", menuItemIds);

  if (error) throw error;

  const menuItems = (data ?? []) as menuItem[];
  const menuItemMap = new Map(menuItems.map((item) => [String(item.id), item]));
  const categoryIds = [
    ...new Set(
      menuItems
        .map((item) => item.categoryId)
        .filter((id): id is number => typeof id === "number"),
    ),
  ];
  const { data: categories, error: categoryError } = categoryIds.length
    ? await supabaseAdmin.from("Category").select("id, name").in("id", categoryIds)
    : { data: [], error: null };

  if (categoryError) {
    console.error("Cart category lookup failed:", categoryError.message);
    throw categoryError;
  }

  const categoryNames = new Map(
    (categories ?? []).map((category) => [category.id as number, String(category.name ?? "")]),
  );
  const panAsianTitles = menuItems
    .filter((item) => isPanAsianCuisine(item.cuisine))
    .map((item) => item.title);
  const asianStarterTitles = menuItems
    .filter((item) => isAsianStartersGravyCuisine(item.cuisine))
    .map((item) => item.title);
  const [catalog, asianStarterPrices] = await Promise.all([
    loadPanAsianCatalog(panAsianTitles),
    loadAsianStartersGravyCatalog(asianStarterTitles),
  ]);

  return rows.map((row) => {
    const menuItemRow = menuItemMap.get(String(row.menu_item_id));

    if (menuItemRow && isDessertTitle(menuItemRow.title)) {
      const quote = quoteDessertSelection(menuItemRow.title, row.selected_protein);

      if ("error" in quote) {
        throw new Error(quote.error);
      }

      return {
        ...row,
        title: menuItemRow.title,
        image_url: menuItemRow.imageUrl || row.image_url || "/fallback-image.jpg",
        base_price: quote.base_price,
        protein_price: quote.protein_price,
        price: quote.price,
      };
    }

    if (
      menuItemRow &&
      isSoupsCategoryName(categoryNames.get(menuItemRow.categoryId))
    ) {
      const quote = quoteSoupSelection(menuItemRow.price, row.selected_protein);

      if ("error" in quote) {
        console.error("Soup reprice failed:", {
          menuItemId: row.menu_item_id,
          categoryId: menuItemRow.categoryId,
          message: quote.error,
        });
        throw new Error(quote.error);
      }

      return {
        ...row,
        title: menuItemRow.title,
        image_url: menuItemRow.imageUrl || row.image_url || "/fallback-image.jpg",
        base_price: quote.base_price,
        protein_price: quote.protein_price,
        price: quote.price,
      };
    }

    if (menuItemRow && isAsianStartersGravyCuisine(menuItemRow.cuisine)) {
      const quote = quoteAsianStartersGravySelection({
        title: menuItemRow.title,
        selection: row.selected_protein ?? "",
        prices: asianStarterPrices,
      });

      if ("error" in quote) {
        throw new Error(quote.error);
      }

      return {
        ...row,
        title: menuItemRow.title,
        image_url: menuItemRow.imageUrl || row.image_url || "/fallback-image.jpg",
        base_price: quote.base_price,
        protein_price: quote.protein_price,
        price: quote.price,
      };
    }

    if (!menuItemRow || !isPanAsianCuisine(menuItemRow.cuisine)) {
      return enrichCartItem(row, menuItemRow);
    }

    const quote = quotePanAsianSelection({
      title: menuItemRow.title,
      selection: row.selected_protein ?? "",
      prices: catalog.prices,
      ingredients: catalog.ingredients,
    });

    if ("error" in quote) {
      throw new Error(quote.error);
    }

    return {
      ...row,
      title: menuItemRow.title,
      image_url: menuItemRow.imageUrl || row.image_url || "/fallback-image.jpg",
      base_price: quote.base_price,
      protein_price: quote.protein_price,
      price: quote.price,
    };
  });
}
