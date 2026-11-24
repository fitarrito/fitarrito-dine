import { NextResponse } from "next/server";
import { getWaiterSession } from "@lib/waiterSession";
import { settleWaiterOrder, WaiterOrderError } from "@lib/waiterDineOrders";

export const dynamic = "force-dynamic";

function json(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const session = await getWaiterSession();

  if (!session) return json({ error: "Waiter sign-in is required." }, 401);

  const orderId = Number((await context.params).orderId);

  if (!Number.isInteger(orderId) || orderId < 1) return json({ error: "Order not found." }, 404);

  const body = await request.json().catch(() => ({}));
  const method = body.method === "qr" ? "qr" : body.method === "cash" ? "cash" : null;

  if (!method) return json({ error: "Choose cash or QR." }, 400);

  try {
    return json({
      order: await settleWaiterOrder(orderId, {
        method,
        amountReceived: body.amountReceived == null ? null : Number(body.amountReceived),
        transactionReference:
          typeof body.transactionReference === "string" ? body.transactionReference : null,
        confirmed: body.confirmed === true,
        receivedBy: session.name,
      }),
    });
  } catch (error) {
    const status = error instanceof WaiterOrderError ? error.status : 500;

    return json(
      { error: error instanceof Error ? error.message : "Unable to settle this table." },
      status,
    );
  }
}
