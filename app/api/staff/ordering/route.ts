import { NextResponse } from "next/server";
import { getSupabaseAdminConfig } from "@lib/getSupabaseAdmin";
import { hasStaffSession } from "@lib/staffSession";
import {
  getStoreOrderingSetting,
  setStoreOrderingEnabled,
  StoreOrderingError,
  StoreSettingsMissingError,
} from "@lib/storeOrdering";

export const dynamic = "force-dynamic";

function json(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function failure(error: unknown, fallback: string) {
  if (error instanceof StoreSettingsMissingError) {
    return json({ error: error.message }, 404);
  }

  if (error instanceof StoreOrderingError) {
    return json({ error: error.message }, error.status);
  }

  console.error(fallback, error);
  return json({ error: fallback }, 500);
}

async function authorize() {
  if (!(await hasStaffSession())) {
    return json({ error: "Staff sign-in is required." }, 401);
  }

  if (!getSupabaseAdminConfig()) {
    return json({ error: "Online ordering settings are temporarily unavailable." }, 503);
  }

  return null;
}

export async function GET() {
  const denied = await authorize();

  if (denied) return denied;

  try {
    return json({ setting: await getStoreOrderingSetting() });
  } catch (error) {
    return failure(error, "Unable to load online ordering status.");
  }
}

export async function PATCH(request: Request) {
  const denied = await authorize();

  if (denied) return denied;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json({ error: "enabled must be a boolean." }, 400);
  }

  const enabled =
    typeof body === "object" && body !== null && "enabled" in body
      ? body.enabled
      : undefined;

  if (typeof enabled !== "boolean") {
    return json({ error: "enabled must be a boolean." }, 400);
  }

  try {
    return json({ setting: await setStoreOrderingEnabled(enabled) });
  } catch (error) {
    return failure(error, "Unable to update online ordering.");
  }
}
