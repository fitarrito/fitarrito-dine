import { NextResponse } from "next/server";
import {
  getSupabaseConfig,
  getSupabaseServerClient,
  withTimeout,
} from "@lib/getSupabaseServer";
import { normalizeCuisineQuery } from "@lib/menuCuisine";

export const dynamic = "force-dynamic";

const noStore = {
  headers: { "Cache-Control": "private, no-store, max-age=0" },
};

export async function GET(request: Request) {
  if (!getSupabaseConfig()) {
    return NextResponse.json(
      {
        error:
          "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.",
      },
      { status: 503, ...noStore },
    );
  }

  const cuisine = normalizeCuisineQuery(
    new URL(request.url).searchParams.get("cuisine"),
  );

  try {
    const supabase = getSupabaseServerClient();

    if (cuisine) {
      const { data: menuItems, error: menuError } = await withTimeout(
        supabase.from("MenuItem").select("categoryId").eq("cuisine", cuisine),
        10_000,
        "Menu category lookup",
      );

      if (menuError) throw menuError;

      const categoryIds = [
        ...new Set(
          (menuItems ?? [])
            .map((item) => Number(item.categoryId))
            .filter((id) => Number.isInteger(id) && id > 0),
        ),
      ];

      if (!categoryIds.length) {
        return NextResponse.json([], noStore);
      }

      const { data, error } = await withTimeout(
        supabase.from("Category").select("*").in("id", categoryIds),
        10_000,
        "Category fetch",
      );

      if (error) throw error;

      return NextResponse.json(data ?? [], noStore);
    }

    const { data, error } = await withTimeout(
      supabase.from("Category").select("*"),
      10_000,
      "Category fetch",
    );

    if (error) throw error;

    return NextResponse.json(data ?? [], noStore);
  } catch (error) {
    console.error("GET /api/category failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch categories",
      },
      { status: 500, ...noStore },
    );
  }
}
