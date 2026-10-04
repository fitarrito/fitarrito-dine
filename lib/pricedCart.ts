import "server-only";

import type { menuItem } from "@/types/types";
import { getSupabaseAdminClient } from "@lib/getSupabaseAdmin";
import {
  enrichCartItems,
  type CartItemRecord,
  type EnrichedCartItem,
} from "@lib/cartItemsServer";

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

  return enrichCartItems(rows, (data ?? []) as menuItem[]);
}
