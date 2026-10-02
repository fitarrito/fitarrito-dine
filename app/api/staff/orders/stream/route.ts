import { createStaffRealtimeClient, getActiveStaffOrder } from "@lib/staffOrders";
import { getSupabaseAdminConfig } from "@lib/getSupabaseAdmin";
import { hasStaffSession } from "@lib/staffSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!(await hasStaffSession())) {
    return new Response(JSON.stringify({ error: "Staff sign-in is required." }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  if (!getSupabaseAdminConfig()) {
    return new Response(JSON.stringify({ error: "Order data is temporarily unavailable." }), {
      status: 503,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const encoder = new TextEncoder();
  let closed = false;
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: object) => {
        if (closed) return;

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const client = createStaffRealtimeClient();
      const pending = new Map<number, ReturnType<typeof setTimeout>>();
      const versions = new Map<number, number>();

      const publish = (orderId: number, allowRemove: boolean) => {
        const existing = pending.get(orderId);

        if (existing) clearTimeout(existing);

        const version = (versions.get(orderId) ?? 0) + 1;
        versions.set(orderId, version);

        pending.set(
          orderId,
          setTimeout(() => {
            pending.delete(orderId);

            void getActiveStaffOrder(orderId)
              .then((order) => {
                if (versions.get(orderId) !== version) return;

                if (!order) {
                  if (allowRemove) send({ type: "remove", orderId });
                  return;
                }

                send({ type: "order", order });

                if (order.items.length > 0) return;

                setTimeout(() => {
                  void getActiveStaffOrder(orderId)
                    .then((complete) => {
                      if (versions.get(orderId) !== version) return;
                      if (complete?.items.length) {
                        send({ type: "order", order: complete });
                      }
                    })
                    .catch((error) => {
                      console.error("Unable to refresh staff order items:", error);
                    });
                }, 700);
              })
              .catch((error) => {
                console.error("Unable to load a live staff order:", error);
                send({
                  type: "error",
                  message: "A new order was saved, but the dashboard could not load it yet.",
                });
              });
          }, 400),
        );
      };

      const channel = client
        .channel(`staff-orders-${crypto.randomUUID()}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "orders" },
          (payload) => {
            const orderId = Number(payload.new?.id);

            if (Number.isInteger(orderId)) publish(orderId, false);
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "orders" },
          (payload) => {
            const orderId = Number(payload.new?.id);

            if (Number.isInteger(orderId)) publish(orderId, true);
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "order_items" },
          (payload) => {
            const orderId = Number(payload.new?.order_id);

            if (Number.isInteger(orderId)) publish(orderId, false);
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            send({ type: "ready" });
            return;
          }

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            send({
              type: "error",
              message: "Live updates disconnected. Orders will keep refreshing.",
            });
            cleanup();

            try {
              controller.close();
            } catch {
              // The browser already closed the stream.
            }
          }
        });

      const heartbeat = setInterval(() => {
        send({ type: "ping" });
      }, 15000);

      cleanup = () => {
        if (closed) return;

        closed = true;
        clearInterval(heartbeat);

        for (const timer of pending.values()) clearTimeout(timer);

        void client.removeChannel(channel).catch(() => undefined);
      };

      request.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
