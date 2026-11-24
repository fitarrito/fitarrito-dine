import { NextResponse } from "next/server";
import { getWaiterSession } from "@lib/waiterSession";
import { listWaiterOrders, WaiterOrderError } from "@lib/waiterDineOrders";

export const dynamic = "force-dynamic";

function json(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  if (!(await getWaiterSession())) {
    return json({ error: "Waiter sign-in is required." }, 401);
  }

  const scope = new URL(request.url).searchParams.get("scope") === "settled" ? "settled" : "active";

  try {
    return json({ orders: await listWaiterOrders(scope) });
  } catch (error) {
    const status = error instanceof WaiterOrderError ? error.status : 500;

    return json(
      { error: error instanceof Error ? error.message : "Unable to load orders." },
      status,
    );
  }
}
