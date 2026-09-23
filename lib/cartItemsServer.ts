import type { menuItem, ProteinVariant } from "@/types/types";

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

function findProteinVariant(
  menuItemRow: menuItem,
  selectedProtein?: string | null,
): ProteinVariant | undefined {
  if (!selectedProtein) return undefined;

  return menuItemRow.proteinVariants?.find(
    (protein) =>
      protein.name.toLowerCase() === selectedProtein.toLowerCase() &&
      protein.name.toLowerCase() !== "mutton",
  );
}

export function calculateCartItemPricing(
  menuItemRow: menuItem,
  selectedProtein?: string | null,
) {
  const basePrice = parseFloat(String(menuItemRow.price || 0));
  const proteinVariant = findProteinVariant(menuItemRow, selectedProtein);
  const proteinPrice = parseFloat(String(proteinVariant?.price || 0));

  return {
    base_price: basePrice,
    protein_price: proteinPrice,
    price: basePrice + proteinPrice,
  };
}

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

  const pricing = calculateCartItemPricing(menuItemRow, row.selected_protein);

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
