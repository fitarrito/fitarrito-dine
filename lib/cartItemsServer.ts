import type { menuItem } from "@/types/types";
import { calculateMenuItemPricing } from "@lib/menuPricing";

export type CartItemRecord = {
  id: string;
  table_id: string;
  session_id: string;
  menu_item_id: string | number;
  title?: string | null;
  image_url?: string | null;
  selected_protein?: string | null;
  selected_size?: string | null;
  quantity: number;
  price?: number | null;
  base_price?: number | null;
  protein_price?: number | null;
  created_at?: string;
};

export type EnrichedCartItem = CartItemRecord & {
  title: string;
  image_url: string;
  price: number;
  base_price: number;
  protein_price: number;
};

export function enrichCartItem(
  row: CartItemRecord,
  menuItemRow: menuItem | null | undefined,
): EnrichedCartItem {
  if (!menuItemRow) {
    const fallbackPrice = Number(row.price || 0);

    return {
      ...row,
      title: row.title ?? "Menu item",
      image_url: row.image_url ?? "/fallback-image.jpg",
      price: fallbackPrice,
      base_price: Number(row.base_price ?? fallbackPrice),
      protein_price: Number(row.protein_price ?? 0),
    };
  }

  const pricing = calculateMenuItemPricing(
    menuItemRow,
    row.selected_protein,
    row.selected_size,
  );

  return {
    ...row,
    title: menuItemRow.title,
    image_url: menuItemRow.imageUrl || row.image_url || "/fallback-image.jpg",
    ...pricing,
  };
}

export function buildMenuItemMap(menuItems: menuItem[]) {
  return new Map(menuItems.map((item) => [String(item.id), item]));
}

export function enrichCartItems(
  rows: CartItemRecord[],
  menuItems: menuItem[],
): EnrichedCartItem[] {
  const menuItemMap = buildMenuItemMap(menuItems);

  return rows.map((row) =>
    enrichCartItem(row, menuItemMap.get(String(row.menu_item_id))),
  );
}
