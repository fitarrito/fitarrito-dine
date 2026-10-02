import { NextResponse } from "next/server";
import {
  clearStaffSessionCookie,
  hasStaffSession,
  setStaffSessionCookie,
  staffDashboardAuthConfigured,
  verifyStaffDashboardPassword,
} from "@lib/staffSession";

export const dynamic = "force-dynamic";

function json(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  if (!staffDashboardAuthConfigured()) {
    return json(
      {
        authenticated: false,
        configured: false,
        error:
          "Staff dashboard login is not configured. Set STAFF_DASHBOARD_PASSWORD and STAFF_ORDER_CONFIRM_SECRET.",
      },
      503,
    );
  }

  return json({
    authenticated: await hasStaffSession(),
    configured: true,
  });
}

export async function POST(request: Request) {
  if (!staffDashboardAuthConfigured()) {
    return json(
      {
        error:
          "Staff dashboard login is not configured. Set STAFF_DASHBOARD_PASSWORD and STAFF_ORDER_CONFIRM_SECRET.",
      },
      503,
    );
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  if (!verifyStaffDashboardPassword(password)) {
    return json({ error: "Incorrect staff password." }, 401);
  }

  await setStaffSessionCookie();

  return json({ authenticated: true });
}

export async function DELETE() {
  await clearStaffSessionCookie();

  return json({ authenticated: false });
}
