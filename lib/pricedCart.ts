import "server-only";

import type { menuItem } from "@/types/types";
import { getSupabaseAdminClient } from "@lib/getSupabaseAdmin";
import {
  enrichCartItem,
  type CartItemRecord,
  type EnrichedCartItem,
} from "@lib/cartItemsServer";
import { loadPanAsianCatalog } from "@lib/panAsianCatalog";
import { isPanAsianCuisine, quotePanAsianSelection } from "@lib/panAsianOrder";

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
  const panAsianTitles = menuItems
    .filter((item) => isPanAsianCuisine(item.cuisine))
    .map((item) => item.title);
  const catalog = await loadPanAsianCatalog(panAsianTitles);

  return rows.map((row) => {
    const menuItemRow = menuItemMap.get(String(row.menu_item_id));

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
