import { NextResponse } from "next/server";
import { getWaiterSession } from "@lib/waiterSession";
import {
  getWaiterOrder,
  saveWaiterOrderNotes,
  WaiterOrderError,
} from "@lib/waiterDineOrders";

export const dynamic = "force-dynamic";

function json(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function orderIdFrom(params: Promise<{ orderId: string }>) {
  const { orderId } = await params;
  const id = Number(orderId);

  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  if (!(await getWaiterSession())) return json({ error: "Waiter sign-in is required." }, 401);

  const orderId = await orderIdFrom(context.params);

  if (!orderId) return json({ error: "Order not found." }, 404);

  try {
    return json({ order: await getWaiterOrder(orderId) });
  } catch (error) {
    const status = error instanceof WaiterOrderError ? error.status : 500;

    return json({ error: error instanceof Error ? error.message : "Unable to load the order." }, status);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  if (!(await getWaiterSession())) return json({ error: "Waiter sign-in is required." }, 401);

  const orderId = await orderIdFrom(context.params);

  if (!orderId) return json({ error: "Order not found." }, 404);

  const body = await request.json().catch(() => ({}));
  const notes = typeof body.notes === "string" ? body.notes : "";

  try {
    return json({ order: await saveWaiterOrderNotes(orderId, notes) });
  } catch (error) {
    const status = error instanceof WaiterOrderError ? error.status : 500;

    return json({ error: error instanceof Error ? error.message : "Unable to save the note." }, status);
  }
}
