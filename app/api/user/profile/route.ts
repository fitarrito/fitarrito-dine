import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@lib/supabase-server";
import {
  fetchUserProfile,
  getProfileFromAuthUser,
  upsertUserProfile,
} from "@lib/user-profile";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ profile: null }, { status: 401 });
    }

    await upsertUserProfile(supabase, user);

    const { data: row } = await fetchUserProfile(supabase, user.id);
    const profile = row ?? getProfileFromAuthUser(user);

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("GET /api/user/profile failed:", error);
    return NextResponse.json(
      { error: "Failed to load user profile" },
      { status: 500 },
    );
  }
}
