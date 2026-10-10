import { NextResponse } from "next/server";
import { getSupabaseAdminConfig } from "@lib/getSupabaseAdmin";
import {
  getStoreOrderingSetting,
  StoreSettingsMissingError,
} from "@lib/storeOrdering";

export const dynamic = "force-dynamic";

function json(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  if (!getSupabaseAdminConfig()) {
    return json({ error: "Online ordering status is temporarily unavailable." }, 503);
  }

  try {
    const setting = await getStoreOrderingSetting();

    return json({
      onlineOrderingEnabled: setting.online_ordering_enabled,
      updatedAt: setting.updated_at,
    });
  } catch (error) {
    if (error instanceof StoreSettingsMissingError) {
      return json({ error: error.message }, 404);
    }

    console.error("Unable to read online ordering status:", error);
    return json({ error: "Unable to read online ordering status." }, 500);
  }
}
