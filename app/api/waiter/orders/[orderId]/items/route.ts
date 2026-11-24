import { NextResponse } from "next/server";
import { getWaiterSession } from "@lib/waiterSession";
import {
  addWaiterOrderItem,
  clearWaiterOrderItems,
  updateWaiterOrderItem,
  WaiterOrderError,
} from "@lib/waiterDineOrders";

export const dynamic = "force-dynamic";

function json(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function readOrderId(params: Promise<{ orderId: string }>) {
  const id = Number((await params).orderId);

  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  if (!(await getWaiterSession())) return json({ error: "Waiter sign-in is required." }, 401);

  const orderId = await readOrderId(context.params);

  if (!orderId) return json({ error: "Order not found." }, 404);

  const body = await request.json().catch(() => ({}));
  const menuItemId = String(body.menuItemId ?? body.menu_item_id ?? "").trim();
  const selectedProtein = String(body.selectedProtein ?? body.selected_protein ?? "").trim();
  const quantity = Number(body.quantity ?? 1);

  if (!menuItemId || !selectedProtein) {
    return json({ error: "Choose a dish and its options." }, 400);
  }

  try {
    return json({
      order: await addWaiterOrderItem(orderId, {
        menuItemId,
        selectedProtein,
        selectedSize: body.selectedSize ?? body.selected_size ?? null,
        itemFormat: body.itemFormat ?? body.item_format ?? null,
        quantity,
      }),
    });
  } catch (error) {
    const status = error instanceof WaiterOrderError ? error.status : 500;

    return json({ error: error instanceof Error ? error.message : "Unable to add this dish." }, status);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  if (!(await getWaiterSession())) return json({ error: "Waiter sign-in is required." }, 401);

  const orderId = await readOrderId(context.params);

  if (!orderId) return json({ error: "Order not found." }, 404);

  const body = await request.json().catch(() => ({}));
  const itemId = Number(body.id);
  const quantity = Number(body.quantity);

  if (!Number.isInteger(itemId)) return json({ error: "Dish not found." }, 400);

  try {
    return json({ order: await updateWaiterOrderItem(orderId, itemId, quantity) });
  } catch (error) {
    const status = error instanceof WaiterOrderError ? error.status : 500;

    return json(
      { error: error instanceof Error ? error.message : "Unable to update the quantity." },
      status,
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  if (!(await getWaiterSession())) return json({ error: "Waiter sign-in is required." }, 401);

  const orderId = await readOrderId(context.params);

  if (!orderId) return json({ error: "Order not found." }, 404);

  try {
    return json({ order: await clearWaiterOrderItems(orderId) });
  } catch (error) {
    const status = error instanceof WaiterOrderError ? error.status : 500;

    return json({ error: error instanceof Error ? error.message : "Unable to clear the order." }, status);
  }
}
