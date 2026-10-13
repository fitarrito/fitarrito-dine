import "server-only";

import { getSupabaseAdminClient } from "@lib/getSupabaseAdmin";
import {
  quoteAsianStartersGravySelection,
  type AsianStartersGravyPriceOption,
} from "@lib/asianStartersGravyOrder";

type PriceRow = {
  id: number;
  dish_title: string;
  category: string;
  price: number | string;
  sort_order: number;
  is_available: boolean;
};

function toPrice(row: PriceRow): AsianStartersGravyPriceOption {
  return {
    id: Number(row.id),
    dish_title: row.dish_title,
    category: row.category,
    price: Number(row.price),
    sort_order: row.sort_order,
    is_available: row.is_available,
  };
}

export async function loadAsianStartersGravyCatalog(titles: string[]) {
  const uniqueTitles = [...new Set(titles.map((title) => title.trim()).filter(Boolean))];

  if (uniqueTitles.length === 0) {
    return [] as AsianStartersGravyPriceOption[];
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("asian_starters_gravy_prices")
    .select("id, dish_title, category, price, sort_order, is_available")
    .in("dish_title", uniqueTitles)
    .eq("is_available", true)
    .order("sort_order");

  if (error) throw error;

  return ((data ?? []) as PriceRow[]).map(toPrice);
}

export async function quoteStoredAsianStartersGravySelection(title: string, selection: string) {
  const prices = await loadAsianStartersGravyCatalog([title]);

  return quoteAsianStartersGravySelection({
    title,
    selection,
    prices,
  });
}
