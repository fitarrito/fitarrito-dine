import { NextResponse } from "next/server";
import {
  getSupabaseConfig,
  getSupabaseServerClient,
  withTimeout,
} from "@lib/getSupabaseServer";
import { normalizeCuisineQuery } from "@lib/menuCuisine";
import { loadPanAsianCatalog } from "@lib/panAsianCatalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!getSupabaseConfig()) {
    return NextResponse.json(
      {
        error:
          "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.",
      },
      { status: 503 },
    );
  }

  const cuisine = normalizeCuisineQuery(
    new URL(request.url).searchParams.get("cuisine"),
  );

  try {
    const supabase = getSupabaseServerClient();

    let query = supabase.from("MenuItem").select("*");

    if (cuisine) {
      query = query.eq("cuisine", cuisine);
    }

    const { data, error } = await withTimeout(query, 10_000, "Menu fetch");

    if (error) throw error;

    const items = data ?? [];

    if (cuisine !== "Pan Asian" || items.length === 0) {
      return NextResponse.json(items);
    }

    const catalog = await loadPanAsianCatalog(
      items.map((item) => String(item.title ?? "")),
    );

    return NextResponse.json(
      items.map((item) => ({
        ...item,
        panAsianPrices: catalog.prices.filter(
          (option) => option.dish_title === item.title,
        ),
        panAsianIngredients: catalog.ingredients.filter(
          (ingredient) => ingredient.dish_title === item.title,
        ),
      })),
    );
  } catch (error) {
    console.error("GET /api/menu failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch menu",
      },
      { status: 500 },
    );
  }
}
