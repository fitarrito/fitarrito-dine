import "server-only";

import type { menuItem } from "@/types/types";
import { getSupabaseAdminClient } from "@lib/getSupabaseAdmin";
import {
  enrichCartItem,
  type CartItemRecord,
  type EnrichedCartItem,
} from "@lib/cartItemsServer";
import { loadAsianStartersGravyCatalog } from "@lib/asianStartersGravyCatalog";
import { isAsianStartersGravyCuisine } from "@lib/asianStartersGravyOrder";
import { loadPanAsianCatalog } from "@lib/panAsianCatalog";
import { isPanAsianCuisine } from "@lib/panAsianOrder";
import { isSoupsCategoryName } from "@lib/soups";
import { loadSoupsBowlsCatalog } from "@lib/soupsBowlsCatalog";
import { resolveMenuItemImageUrl } from "@lib/menuImages";
import { quoteOrderItem } from "@lib/orderQuote";
import { isBlockedMenuTitle } from "@lib/menuVisibility";

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
  const soupsBowlsTitles = menuItems
    .filter((item) => isSoupsCategoryName(categoryNames.get(item.categoryId)))
    .map((item) => item.title);
  const [catalog, asianStarterPrices, soupsBowlsPrices] = await Promise.all([
    loadPanAsianCatalog(panAsianTitles),
    loadAsianStartersGravyCatalog(asianStarterTitles),
    loadSoupsBowlsCatalog(soupsBowlsTitles),
  ]);

  return rows.map((row) => {
    const menuItemRow = menuItemMap.get(String(row.menu_item_id));

    if (!menuItemRow) return enrichCartItem(row, menuItemRow);

    if (isBlockedMenuTitle(menuItemRow.title)) {
      throw new Error("This dish is not on the menu.");
    }

    const quote = quoteOrderItem({
      item: menuItemRow,
      categoryName: categoryNames.get(menuItemRow.categoryId) ?? null,
      selectedProtein: row.selected_protein,
      selectedSize: row.selected_size,
      panAsianPrices: catalog.prices,
      panAsianIngredients: catalog.ingredients,
      asianStarterPrices,
      soupsBowlsPrices,
    });

    if ("error" in quote) {
      throw new Error(quote.error);
    }

    return {
      ...row,
      title: menuItemRow.title,
      image_url: resolveMenuItemImageUrl({
        title: menuItemRow.title,
        imageUrl: menuItemRow.imageUrl || row.image_url || undefined,
      }),
      is_available: menuItemRow.is_available === true,
      base_price: quote.base_price,
      protein_price: quote.protein_price,
      price: quote.price,
    };
  });
}
