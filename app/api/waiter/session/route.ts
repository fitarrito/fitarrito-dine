import { NextResponse } from "next/server";
import {
  clearWaiterSessionCookie,
  getWaiterSession,
  setWaiterSessionCookie,
  verifyWaiterPassword,
  waiterAuthConfigured,
} from "@lib/waiterSession";

export const dynamic = "force-dynamic";

function json(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  if (!waiterAuthConfigured()) {
    return json(
      {
        authenticated: false,
        configured: false,
        error: "Waiter login is not configured.",
      },
      503,
    );
  }

  const session = await getWaiterSession();

  return json({
    authenticated: Boolean(session),
    configured: true,
    name: session?.name ?? null,
  });
}

export async function POST(request: Request) {
  if (!waiterAuthConfigured()) {
    return json({ error: "Waiter login is not configured." }, 503);
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) return json({ error: "Enter your name." }, 400);
  if (!verifyWaiterPassword(password)) return json({ error: "Incorrect password." }, 401);

  await setWaiterSessionCookie(name);

  return json({ authenticated: true, name });
}

export async function DELETE() {
  await clearWaiterSessionCookie();

  return json({ authenticated: false });
}
