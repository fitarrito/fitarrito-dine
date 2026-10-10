import "server-only";

import { getSupabaseAdminClient } from "@lib/getSupabaseAdmin";
import {
  quotePanAsianSelection,
  type PanAsianIngredient,
  type PanAsianPriceOption,
} from "@lib/panAsianOrder";

type PriceRow = {
  id: number;
  dish_title: string;
  category: string;
  price: number | string;
  sort_order: number;
  is_available: boolean;
};

type IngredientRow = {
  id: number;
  dish_title: string;
  category: string;
  ingredient_name: string;
  extra_price: number | string;
  sort_order: number;
  is_available: boolean;
};

function toPrice(row: PriceRow): PanAsianPriceOption {
  return {
    id: Number(row.id),
    dish_title: row.dish_title,
    category: row.category,
    price: Number(row.price),
    sort_order: row.sort_order,
    is_available: row.is_available,
  };
}

function toIngredient(row: IngredientRow): PanAsianIngredient {
  return {
    id: Number(row.id),
    dish_title: row.dish_title,
    category: row.category,
    ingredient_name: row.ingredient_name,
    extra_price: Number(row.extra_price),
    sort_order: row.sort_order,
    is_available: row.is_available,
  };
}

export async function loadPanAsianCatalog(titles: string[]) {
  const uniqueTitles = [...new Set(titles.map((title) => title.trim()).filter(Boolean))];

  if (uniqueTitles.length === 0) {
    return { prices: [] as PanAsianPriceOption[], ingredients: [] as PanAsianIngredient[] };
  }

  const supabase = getSupabaseAdminClient();
  const [priceResult, ingredientResult] = await Promise.all([
    supabase
      .from("pan_asian_price_options")
      .select("id, dish_title, category, price, sort_order, is_available")
      .in("dish_title", uniqueTitles)
      .order("sort_order"),
    supabase
      .from("pan_asian_ingredients")
      .select(
        "id, dish_title, category, ingredient_name, extra_price, sort_order, is_available",
      )
      .in("dish_title", uniqueTitles)
      .order("sort_order"),
  ]);

  if (priceResult.error) throw priceResult.error;
  if (ingredientResult.error) throw ingredientResult.error;

  return {
    prices: ((priceResult.data ?? []) as PriceRow[]).map(toPrice),
    ingredients: ((ingredientResult.data ?? []) as IngredientRow[]).map(toIngredient),
  };
}

export async function quoteStoredPanAsianSelection(title: string, selection: string) {
  const catalog = await loadPanAsianCatalog([title]);

  return quotePanAsianSelection({
    title,
    selection,
    prices: catalog.prices,
    ingredients: catalog.ingredients,
  });
}
