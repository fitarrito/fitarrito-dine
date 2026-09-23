import { NextResponse } from "next/server";
import {
  getSupabaseConfig,
  getSupabaseServerClient,
  withTimeout,
} from "@lib/getSupabaseServer";
import { normalizeCuisineQuery } from "@lib/menuCuisine";

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
            .map((item) => item.categoryId)
            .filter((id): id is number => typeof id === "number"),
        ),
      ];

      if (!categoryIds.length) {
        return NextResponse.json([]);
      }

      const { data, error } = await withTimeout(
        supabase.from("Category").select("*").in("id", categoryIds),
        10_000,
        "Category fetch",
      );

      if (error) throw error;

      return NextResponse.json(data ?? []);
    }

    const { data, error } = await withTimeout(
      supabase.from("Category").select("*"),
      10_000,
      "Category fetch",
    );

    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("GET /api/category failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch categories",
      },
      { status: 500 },
    );
  }
}
