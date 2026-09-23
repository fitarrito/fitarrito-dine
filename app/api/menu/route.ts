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
