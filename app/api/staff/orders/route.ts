import { NextResponse } from "next/server";
import { getSupabaseAdminConfig } from "@lib/getSupabaseAdmin";
import { hasStaffSession } from "@lib/staffSession";
import { listActiveStaffOrders } from "@lib/staffOrders";

export const dynamic = "force-dynamic";

function json(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  if (!(await hasStaffSession())) {
    return json({ error: "Staff sign-in is required." }, 401);
  }

  if (!getSupabaseAdminConfig()) {
    return json({ error: "Order data is temporarily unavailable." }, 503);
  }

  try {
    return json({ orders: await listActiveStaffOrders() });
  } catch (error) {
    console.error("Unable to load staff orders:", error);
    return json({ error: "Unable to load orders." }, 500);
  }
}
