import "server-only";
import { getSupabaseAdminClient } from "@lib/getSupabaseAdmin";
import {
  ONLINE_ORDERING_CLOSED_ERROR,
  shouldOpenOrderingAtTen,
} from "@lib/onlineOrdering";

const STORE_SETTINGS_ID = 1;

export type StoreSettingsRow = {
  id: number;
  online_ordering_enabled: boolean;
  updated_at: string | null;
};

export class StoreSettingsMissingError extends Error {
  constructor() {
    super("Online ordering settings were not found.");
    this.name = "StoreSettingsMissingError";
  }
}

export class StoreOrderingError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StoreOrderingError";
    this.status = status;
  }
}

function toStoreSettingsRow(data: {
  id: number;
  online_ordering_enabled: boolean | null;
  updated_at: string | null;
}): StoreSettingsRow {
  if (typeof data.online_ordering_enabled !== "boolean") {
    throw new StoreSettingsMissingError();
  }

  return {
    id: Number(data.id),
    online_ordering_enabled: data.online_ordering_enabled,
    updated_at: data.updated_at,
  };
}

async function readStoreOrderingSetting() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("store_settings")
    .select("id, online_ordering_enabled, updated_at")
    .eq("id", STORE_SETTINGS_ID)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new StoreSettingsMissingError();

  return toStoreSettingsRow(data);
}

async function openOrderingForTheDay(row: StoreSettingsRow) {
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("store_settings")
    .update({
      online_ordering_enabled: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", STORE_SETTINGS_ID)
    .eq("online_ordering_enabled", false);

  if (row.updated_at) {
    query = query.eq("updated_at", row.updated_at);
  }

  const { data, error } = await query
    .select("id, online_ordering_enabled, updated_at")
    .maybeSingle();

  if (error) throw error;
  if (!data) return readStoreOrderingSetting();

  return toStoreSettingsRow(data);
}

export async function getStoreOrderingSetting() {
  const row = await readStoreOrderingSetting();

  if (!shouldOpenOrderingAtTen(row.online_ordering_enabled, row.updated_at)) {
    return row;
  }

  return openOrderingForTheDay(row);
}

export async function setStoreOrderingEnabled(enabled: boolean) {
  if (typeof enabled !== "boolean") {
    throw new StoreOrderingError("enabled must be a boolean.", 400);
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("store_settings")
    .update({
      online_ordering_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", STORE_SETTINGS_ID)
    .select("id, online_ordering_enabled, updated_at")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new StoreSettingsMissingError();

  const row = toStoreSettingsRow(data);

  if (row.online_ordering_enabled !== enabled) {
    throw new StoreOrderingError("Online ordering status could not be confirmed.", 500);
  }

  return row;
}

export async function onlineOrderingBlock() {
  try {
    const setting = await getStoreOrderingSetting();

    if (setting.online_ordering_enabled) return null;

    return { status: 403, error: ONLINE_ORDERING_CLOSED_ERROR };
  } catch (error) {
    console.error("Unable to read online ordering status:", error);

    return {
      status: 503,
      error: "Online ordering is temporarily unavailable.",
    };
  }
}
