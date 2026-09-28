import { NextResponse } from "next/server";
import {
  getSupabaseConfig,
  getSupabaseServerClient,
  withTimeout,
} from "@lib/getSupabaseServer";
import { normalizeCuisineQuery } from "@lib/menuCuisine";
import { FITARRITO_HOUSE_TITLES } from "@lib/fitarritoHouseMenu";

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

    if (cuisine === "Fitarrito House") {
      const { data: cuisineRows, error: cuisineError } = await withTimeout(
        supabase.from("MenuItem").select("*").eq("cuisine", cuisine),
        10_000,
        "Menu fetch",
      );

      if (cuisineError) throw cuisineError;

      if (cuisineRows && cuisineRows.length > 0) {
        return NextResponse.json(cuisineRows);
      }

      const { data: titleRows, error: titleError } = await withTimeout(
        supabase.from("MenuItem").select("*").in("title", FITARRITO_HOUSE_TITLES),
        10_000,
        "Menu fetch",
      );

      if (titleError) throw titleError;

      return NextResponse.json(titleRows ?? []);
    }

    let query = supabase.from("MenuItem").select("*");

    if (cuisine) {
      query = query.eq("cuisine", cuisine);
    }

    const { data, error } = await withTimeout(query, 10_000, "Menu fetch");

    if (error) throw error;

    return NextResponse.json(data ?? []);
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
