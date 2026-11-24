import { NextResponse } from "next/server";
import { getWaiterSession } from "@lib/waiterSession";
import { listWaiterTables, openWaiterTable, WaiterOrderError } from "@lib/waiterDineOrders";

export const dynamic = "force-dynamic";

function json(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function requireWaiter() {
  const session = await getWaiterSession();

  if (!session) return null;

  return session;
}

export async function GET() {
  const session = await requireWaiter();

  if (!session) return json({ error: "Waiter sign-in is required." }, 401);

  try {
    return json({ tables: await listWaiterTables() });
  } catch (error) {
    const status = error instanceof WaiterOrderError ? error.status : 500;

    return json(
      { error: error instanceof Error ? error.message : "Unable to load tables." },
      status,
    );
  }
}

export async function POST(request: Request) {
  const session = await requireWaiter();

  if (!session) return json({ error: "Waiter sign-in is required." }, 401);

  const body = await request.json().catch(() => ({}));
  const tableNumber = Number(body.tableNumber ?? body.table);

  if (!Number.isInteger(tableNumber) || tableNumber < 1) {
    return json({ error: "Choose a table." }, 400);
  }

  try {
    return json({ order: await openWaiterTable(tableNumber, session.name) });
  } catch (error) {
    const status = error instanceof WaiterOrderError ? error.status : 500;

    return json(
      { error: error instanceof Error ? error.message : "Unable to open this table." },
      status,
    );
  }
}
