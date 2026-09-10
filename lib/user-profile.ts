import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AppUserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

export function normalizePhoneNumber(phone: string | null | undefined) {
  if (!phone) return "";

  const digits = phone.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  if (digits.length === 10) {
    return digits;
  }

  return digits;
}

export function getProfileFromAuthUser(user: User): AppUserProfile {
  const full_name =
    (typeof user.user_metadata?.full_name === "string" &&
      user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    null;

  const email =
    user.email ??
    (typeof user.user_metadata?.email === "string"
      ? user.user_metadata.email
      : null);

  const phone =
    user.phone ??
    (typeof user.user_metadata?.phone === "string"
      ? user.user_metadata.phone
      : null);

  return {
    id: user.id,
    full_name,
    email,
    phone,
  };
}

export async function upsertUserProfile(
  supabase: SupabaseClient,
  user: User,
) {
  const profile = getProfileFromAuthUser(user);

  const { data, error } = await supabase
    .from("User")
    .upsert(
      {
        id: user.id,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
      },
      { onConflict: "id" },
    )
    .select("id, full_name, email, phone")
    .single();

  if (error) {
    console.error("Failed to upsert User profile:", error.message);
    return { data: profile, error };
  }

  return { data: data as AppUserProfile, error: null };
}

export async function fetchUserProfile(
  supabase: SupabaseClient,
  userId: string,
) {
  return supabase
    .from("User")
    .select("id, full_name, email, phone")
    .eq("id", userId)
    .maybeSingle();
}
