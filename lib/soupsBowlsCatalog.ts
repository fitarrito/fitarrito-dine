import "server-only";

import { getSupabaseAdminClient } from "@lib/getSupabaseAdmin";
import type { SoupsBowlsPriceOption, SoupsBowlsStoredProtein, SoupsBowlsServing } from "@lib/soupsBowlsOrder";

type PriceRow = {
  id: number;
  dish_title: string;
  serving_type: string;
  protein: string;
  price: number | string;
  sort_order: number | null;
  is_available: boolean | null;
};

function isServing(value: string): value is SoupsBowlsServing {
  return value === "Soup" || value === "Bowl";
}

function isProtein(value: string): value is SoupsBowlsStoredProtein {
  return value === "None" || value === "Veg" || value === "Chicken" || value === "Prawn";
}

export async function loadSoupsBowlsCatalog(titles: string[]) {
  const uniqueTitles = [...new Set(titles.map((title) => title.trim()).filter(Boolean))];

  if (uniqueTitles.length === 0) return [] as SoupsBowlsPriceOption[];

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("soups_bowls_price_options")
    .select("id, dish_title, serving_type, protein, price, sort_order, is_available")
    .in("dish_title", uniqueTitles)
    .order("sort_order");

  if (error) {
    if (error.code === "PGRST205" || /does not exist/i.test(error.message)) {
      return [] as SoupsBowlsPriceOption[];
    }

    throw error;
  }

  return ((data ?? []) as PriceRow[]).flatMap((row) => {
    if (!isServing(row.serving_type) || !isProtein(row.protein)) return [];

    return [
      {
        id: Number(row.id),
        dish_title: row.dish_title,
        serving_type: row.serving_type,
        protein: row.protein,
        price: Number(row.price),
        sort_order: Number(row.sort_order ?? 0),
        is_available: row.is_available !== false,
      },
    ];
  });
}
