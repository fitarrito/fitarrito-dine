"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { FaSyncAlt, FaVolumeMute, FaVolumeUp, FaWhatsapp } from "react-icons/fa";
import logo from "../../../public/images/logo.svg";
import emptyOrders from "../../../public/images/staff-empty-orders.png";
import { fetchJson } from "@lib/apiFetch";
import { formatRupees } from "@lib/razorpayFee";
import { pendingAlertIds } from "@lib/staffOrderAlerts";
import {
  PREPARATION_ESTIMATES,
  type PreparationMinutes,
} from "@lib/whatsapp/customerConfirmation";
import styles from "./dashboard.module.css";

type OrderItem = {
  id: string | number;
  name: string;
  protein?: string | null;
  quantity: number;
};

type StaffOrder = {
  id: string | number;
  customerName: string;
  customerPhone: string;
  deliveryLocation: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  preparationLabel?: string | null;
  items: OrderItem[];
};

type Notification = {
  ready: boolean;
  sent: false;
  channel: "whatsapp" | null;
  url: string | null;
  message: string;
};

type StatusFilter = "active" | "pending" | "confirmed" | "preparing";
type LiveState = "connecting" | "live" | "reconnecting";

const SOUND_ALERTS_KEY = "fitarrito_staff_sound_alerts";
const SOUND_REPEAT_MS = 3000;

function playOrderChime(context: AudioContext, output: AudioNode) {
  const start = context.currentTime;

  [880, 1174].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStart = start + index * 0.16;

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.18, noteStart + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.28);
    oscillator.connect(gain);
    gain.connect(output);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + 0.3);
  });
}

function notifyNewOrder(order: StaffOrder) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }

  try {
    new Notification(`New Fitarrito order #${order.id}`, {
      body: `${order.customerName} · ${order.deliveryLocation || "Delivery order"}`,
      tag: `fitarrito-order-${order.id}`,
    });
  } catch {
    // The browser can reject a notification without affecting the sound alert.
  }
}

const STATUS_RANK: Record<string, number> = {
  pending: 1,
  confirmed: 2,
  preparing: 3,
  delivered: 4,
  cancelled: 5,
};

function statusRank(status: string) {
  return STATUS_RANK[status] ?? 0;
}

function preferStaffOrder(existing: StaffOrder, incoming: StaffOrder) {
  const items = incoming.items.length > 0 ? incoming.items : existing.items;
  const incomingRank = statusRank(incoming.status);
  const existingRank = statusRank(existing.status);

  if (incomingRank < existingRank) {
    return {
      ...incoming,
      status: existing.status,
      preparationLabel: existing.preparationLabel,
      updatedAt: existing.updatedAt,
      items,
    };
  }

  const existingTime = Date.parse(existing.updatedAt ?? "") || 0;
  const incomingTime = Date.parse(incoming.updatedAt ?? "") || 0;

  if (incomingRank === existingRank && incomingTime < existingTime) {
    return { ...existing, items };
  }

  return { ...incoming, items };
}

function mergeStaffOrder(current: StaffOrder[], incoming: StaffOrder) {
  if (incoming.status === "cancelled" || incoming.status === "delivered") {
    return current.filter((order) => String(order.id) !== String(incoming.id));
  }

  const index = current.findIndex(
    (order) => String(order.id) === String(incoming.id),
  );

  if (index === -1) return [incoming, ...current];

  const orders = current.slice();
  orders[index] = preferStaffOrder(current[index], incoming);

  return orders;
}

function mergeOrderList(current: StaffOrder[], incoming: StaffOrder[]) {
  return incoming.map((order) => {
    const existing = current.find((item) => String(item.id) === String(order.id));

    return existing ? preferStaffOrder(existing, order) : order;
  });
}

function paymentLabel(method: string) {
  const value = method.toLowerCase();

  if (value === "razorpay") return "Razorpay";
  if (value === "qr") return "QR / Online";
  if (value === "cash") return "Cash";

  return method;
}

function statusLabel(status: string) {
  if (status === "preparing") return "Prepared";

  return status;
}

export default function StaffDashboardPage() {
  const [configured, setConfigured] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | number | null>(null);
  const [preparationByOrder, setPreparationByOrder] = useState<
    Record<string, PreparationMinutes>
  >({});
  const [notices, setNotices] = useState<Record<string, Notification>>({});
  const [liveState, setLiveState] = useState<LiveState>("connecting");
  const [baselineIds, setBaselineIds] = useState<Set<string> | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const alarmOutputRef = useRef<GainNode | null>(null);
  const alarmTimerRef = useRef(0);
  const alarmGenerationRef = useRef(0);
  const ordersRef = useRef(orders);
  const baselineRef = useRef(baselineIds);
  const notifiedIds = useRef(new Set<string>());
  const alertCountRef = useRef(0);

  ordersRef.current = orders;
  baselineRef.current = baselineIds;

  const silenceAlarm = useCallback(() => {
    alarmGenerationRef.current += 1;
    window.clearInterval(alarmTimerRef.current);
    alarmTimerRef.current = 0;

    const output = alarmOutputRef.current;
    const context = audioRef.current;

    if (!output || !context || context.state === "closed") return;

    output.gain.cancelScheduledValues(context.currentTime);
    output.gain.setValueAtTime(0.0001, context.currentTime);
  }, []);

  const loadOrders = useCallback(async () => {
    const result = await fetchJson<{ orders: StaffOrder[] }>("/api/staff/orders");
    setOrders((current) => mergeOrderList(current, result.orders));
    setBaselineIds(
      (current) =>
        current ?? new Set(result.orders.map((order) => String(order.id))),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchJson<{ authenticated: boolean; configured: boolean }>("/api/staff/session")
      .then((session) => {
        if (cancelled) return;
        setConfigured(session.configured);
        setAuthenticated(session.authenticated);
        if (session.authenticated) return loadOrders();
      })
      .catch((loadError) => {
        if (!cancelled) {
          const message =
            loadError instanceof Error
              ? loadError.message
              : "Unable to open the staff dashboard.";

          if (message.includes("not configured")) {
            setConfigured(false);
          }

          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadOrders]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SOUND_ALERTS_KEY) === "1") {
        setSoundEnabled(true);
        setSoundBlocked(true);
      }
    } catch {
      // Private browsing can block session storage.
    }
  }, []);

  useEffect(() => {
    return () => {
      const context = audioRef.current;
      audioRef.current = null;

      if (context && context.state !== "closed") {
        void context.close();
      }
    };
  }, []);

  const alertingIds = pendingAlertIds(orders, baselineIds);
  const alertingKey = alertingIds.join(",");

  useEffect(() => {
    const alertCount = alertingKey ? alertingKey.split(",").filter(Boolean).length : 0;
    const startNow = alertCount > alertCountRef.current;
    alertCountRef.current = alertCount;

    if (!soundEnabled || alertCount === 0) {
      silenceAlarm();
      return;
    }

    let stopped = false;

    const ring = async () => {
      const generation = alarmGenerationRef.current;
      const context = audioRef.current;

      if (!context || stopped || generation !== alarmGenerationRef.current) return;

      if (context.state === "suspended") {
        try {
          await context.resume();
        } catch {
          if (!stopped) setSoundBlocked(true);
          return;
        }
      }

      if (
        stopped ||
        generation !== alarmGenerationRef.current ||
        context.state !== "running"
      ) {
        if (!stopped && context.state !== "running") setSoundBlocked(true);
        return;
      }

      let output = alarmOutputRef.current;

      if (!output || output.context !== context) {
        output = context.createGain();
        output.connect(context.destination);
        alarmOutputRef.current = output;
      }

      output.gain.cancelScheduledValues(context.currentTime);
      output.gain.setValueAtTime(1, context.currentTime);
      setSoundBlocked(false);
      playOrderChime(context, output);
    };

    alarmTimerRef.current = window.setInterval(() => {
      void ring();
    }, SOUND_REPEAT_MS);

    if (startNow) void ring();

    return () => {
      stopped = true;
      silenceAlarm();
    };
  }, [alertingKey, silenceAlarm, soundEnabled]);

  useEffect(() => {
    if (!alertingKey) return;

    for (const id of alertingKey.split(",")) {
      if (notifiedIds.current.has(id)) continue;

      notifiedIds.current.add(id);
      const order = orders.find((item) => String(item.id) === id);

      if (order) notifyNewOrder(order);
    }
  }, [alertingKey, orders]);

  useEffect(() => {
    if (!authenticated) return;

    let source: EventSource | null = null;
    let stopped = false;
    let retryId = 0;
    let attempt = 0;

    const connect = () => {
      source = new EventSource("/api/staff/orders/stream");

      source.onmessage = (event) => {
        const payload = JSON.parse(event.data) as {
          type?: string;
          order?: StaffOrder;
          orderId?: string | number;
          message?: string;
        };

        if (payload.type === "ready") {
          attempt = 0;
          setLiveState("live");
          setError((current) =>
            current?.includes("Live updates") || current?.includes("refresh orders")
              ? null
              : current,
          );
          return;
        }

        if (payload.type === "order" && payload.order) {
          setOrders((current) => mergeStaffOrder(current, payload.order as StaffOrder));
          return;
        }

        if (payload.type === "remove" && payload.orderId != null) {
          setOrders((current) =>
            current.filter((order) => String(order.id) !== String(payload.orderId)),
          );
          return;
        }

        if (payload.type === "error") {
          setLiveState("reconnecting");
          setError(payload.message ?? "Live updates disconnected.");
        }
      };

      source.onerror = () => {
        setLiveState("reconnecting");
        source?.close();
        source = null;

        if (stopped) return;

        const delay = Math.min(15000, 1000 * 2 ** attempt);
        attempt += 1;
        retryId = window.setTimeout(connect, delay);
      };
    };

    connect();

    const intervalId = window.setInterval(() => {
      void loadOrders().catch(() => {
        setError("Unable to refresh orders. Live updates will keep trying.");
      });
    }, 20000);

    return () => {
      stopped = true;
      source?.close();
      window.clearTimeout(retryId);
      window.clearInterval(intervalId);
    };
  }, [authenticated, loadOrders]);

  const signIn = async () => {
    setError(null);
    await fetchJson("/api/staff/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setAuthenticated(true);
    setPassword("");
    await loadOrders();
  };

  const signOut = async () => {
    await fetchJson("/api/staff/session", { method: "DELETE" });
    setAuthenticated(false);
    setOrders([]);
    setBaselineIds(null);
    notifiedIds.current.clear();
  };

  const toggleSound = async () => {
    if (soundEnabled && audioRef.current?.state === "running") {
      try {
        sessionStorage.setItem(SOUND_ALERTS_KEY, "0");
      } catch {
        // The in-memory choice still turns the alert off.
      }

      setSoundEnabled(false);
      setSoundBlocked(false);
      return;
    }

    const context = audioRef.current ?? new AudioContext();
    audioRef.current = context;

    try {
      await context.resume();
    } catch {
      setSoundBlocked(true);
    }

    const unlocked = context.state === "running";

    try {
      sessionStorage.setItem(SOUND_ALERTS_KEY, "1");
    } catch {
      // Sound can still play for this page view.
    }

    setSoundEnabled(true);
    setSoundBlocked(!unlocked);

    if (unlocked && alertingIds.length > 0) {
      let output = alarmOutputRef.current;

      if (!output || output.context !== context) {
        output = context.createGain();
        output.connect(context.destination);
        alarmOutputRef.current = output;
      }

      output.gain.setValueAtTime(1, context.currentTime);
      playOrderChime(context, output);
    }

    if (
      unlocked &&
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      void Notification.requestPermission();
    }
  };

  const updateOrder = async (
    order: StaffOrder,
    action: "confirm" | "prepared",
  ) => {
    setBusyOrderId(order.id);
    setError(null);

    try {
      const preparationMinutes = preparationByOrder[String(order.id)];
      const result = await fetchJson<{
        status: string;
        updatedAt?: string | null;
        notification: Notification;
      }>("/api/staff/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          action,
          preparationMinutes,
        }),
      });

      const savedStatus = result.status;
      const preparationLabel =
        PREPARATION_ESTIMATES.find((estimate) => estimate.minutes === preparationMinutes)
          ?.label ?? order.preparationLabel;
      const updatedOrder = {
        ...order,
        status: savedStatus,
        updatedAt: result.updatedAt ?? new Date().toISOString(),
        preparationLabel:
          savedStatus === "confirmed" ? preparationLabel : order.preparationLabel,
      };
      const nextBaseline = new Set(baselineRef.current ?? []);

      if (action === "confirm" && savedStatus !== "pending") {
        nextBaseline.add(String(order.id));
        setBaselineIds(nextBaseline);
        silenceAlarm();
      }

      const nextOrders = mergeStaffOrder(ordersRef.current, updatedOrder);
      setOrders(nextOrders);
      setNotices((current) => ({
        ...current,
        [String(order.id)]: result.notification,
      }));

      if (savedStatus === "confirmed" || savedStatus === "preparing") {
        setFilter(savedStatus);
      }

      await loadOrders().catch(() => {
        setError("The order was updated. Refresh if it does not appear in the new tab.");
      });
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update this order.",
      );
    } finally {
      setBusyOrderId(null);
    }
  };

  const visibleOrders = orders.filter((order) =>
    filter === "active" ? order.status === "pending" : order.status === filter,
  );

  if (loading) {
    return <section className={styles.stateCard}>Loading staff orders...</section>;
  }

  if (!configured) {
    return (
      <section className={styles.stateCard}>
        <h1>Staff dashboard unavailable</h1>
        <p>{error}</p>
      </section>
    );
  }

  if (!authenticated) {
    return (
      <section className={styles.loginCard}>
        <Image
          className={styles.logo}
          src={logo}
          alt="Fitarrito"
          width={48}
          height={48}
        />
        <h1>Staff orders</h1>
        <p>Sign in to view website on-demand orders.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void signIn().catch((signInError) => {
              setError(
                signInError instanceof Error
                  ? signInError.message
                  : "Unable to sign in.",
              );
            });
          }}
        >
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Staff password"
            autoComplete="current-password"
            required
          />
          {error ? <p className={styles.error}>{error}</p> : null}
          <button className={styles.action} type="submit">
            Sign in
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <Image src={logo} alt="Fitarrito" width={42} height={42} />
          <div>
            <h1>Staff orders</h1>
            <p>Website on-demand orders</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.refreshHeader}
            type="button"
            onClick={() => window.location.reload()}
          >
            <FaSyncAlt aria-hidden /> Refresh orders
          </button>
          <button
            className={soundEnabled && !soundBlocked ? styles.soundOn : styles.soundOff}
            type="button"
            onClick={() => void toggleSound()}
          >
            {soundEnabled && !soundBlocked ? (
              <FaVolumeUp aria-hidden />
            ) : (
              <FaVolumeMute aria-hidden />
            )}
            {soundEnabled && !soundBlocked ? "Sound alerts on" : "Enable sound alerts"}
          </button>
          <button className={styles.logout} type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {alertingIds.length > 0 ? (
        <div className={styles.alertBanner} role="status">
          <strong>
            {alertingIds.length === 1
              ? "1 new order needs confirmation"
              : `${alertingIds.length} new orders need confirmation`}
          </strong>
          {filter !== "active" && filter !== "pending" ? (
            <button type="button" onClick={() => setFilter("active")}>
              Show incoming
            </button>
          ) : null}
        </div>
      ) : null}

      {soundBlocked || (!soundEnabled && alertingIds.length > 0) ? (
        <p className={styles.soundReminder}>
          {soundEnabled
            ? "Sound alerts are saved for this visit, but the browser is blocking audio. Tap Enable sound alerts."
            : "Tap Enable sound alerts so new orders can play a sound. Browsers block audio until you do."}
        </p>
      ) : null}

      <div className={styles.filters}>
        {(
          [
            ["active", "Incoming"],
            ["pending", "Pending"],
            ["confirmed", "Confirmed"],
            ["preparing", "Prepared"],
          ] as const
        ).map(([value, label]) => (
          <button
            className={filter === value ? styles.active : ""}
            key={value}
            type="button"
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      {visibleOrders.length === 0 ? (
        <div className={styles.emptyState}>
          <Image
            className={styles.emptyArt}
            src={emptyOrders}
            alt=""
            width={280}
            height={196}
            priority
          />
          <h2>All caught up!</h2>
          <p>
            {filter === "active"
              ? "No new orders right now. New website orders will appear here automatically."
              : "No orders in this view. New website orders will appear here automatically."}
          </p>
          <p className={styles.listening}>
            <span
              className={liveState === "live" ? styles.dot : styles.dotPaused}
              aria-hidden
            />
            {liveState === "live"
              ? "Listening for new orders"
              : liveState === "connecting"
                ? "Connecting..."
                : "Reconnecting"}
          </p>
          <p className={styles.hint}>Keep this dashboard open while you take orders.</p>
          <button
            className={styles.refresh}
            type="button"
            onClick={() => window.location.reload()}
          >
            <FaSyncAlt aria-hidden /> Refresh orders
          </button>
        </div>
      ) : (
        <div className={styles.orders}>
          {visibleOrders.map((order) => {
            const notice = notices[String(order.id)];
            const alerting = alertingIds.includes(String(order.id));

            return (
              <article
                className={alerting ? `${styles.orderCard} ${styles.alerting}` : styles.orderCard}
                key={order.id}
              >
                <header className={styles.orderHeader}>
                  <div>
                    <h2>Order #{order.id}</h2>
                    <p className={styles.meta}>{order.customerName}</p>
                  </div>
                  <span className={alerting ? styles.newBadge : styles.badge}>
                    {alerting ? "New" : statusLabel(order.status)}
                  </span>
                </header>

                <div className={styles.details}>
                  <div>
                    <span>Phone</span>
                    <strong>{order.customerPhone}</strong>
                  </div>
                  <div>
                    <span>Delivery</span>
                    <strong>{order.deliveryLocation}</strong>
                  </div>
                  <div>
                    <span>Payment</span>
                    <strong>
                      {paymentLabel(order.paymentMethod)} · {order.paymentStatus}
                    </strong>
                  </div>
                  <div>
                    <span>Total</span>
                    <strong className={styles.total}>{formatRupees(order.total)}</strong>
                  </div>
                </div>

                {order.items.length === 0 ? (
                  <p className={styles.meta}>Loading items...</p>
                ) : null}
                {order.items.map((item) => (
                  <div className={styles.item} key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      {item.protein ? <span>{item.protein}</span> : null}
                    </div>
                    <strong>Qty {item.quantity}</strong>
                  </div>
                ))}

                {order.status === "pending" ? (
                  <div className={styles.times}>
                    {PREPARATION_ESTIMATES.map((estimate) => (
                      <label key={estimate.minutes}>
                        <input
                          type="radio"
                          name={`prep-${order.id}`}
                          checked={
                            preparationByOrder[String(order.id)] === estimate.minutes
                          }
                          onChange={() =>
                            setPreparationByOrder((current) => ({
                              ...current,
                              [String(order.id)]: estimate.minutes,
                            }))
                          }
                        />
                        {estimate.label}
                      </label>
                    ))}
                  </div>
                ) : null}

                <div className={styles.actions}>
                  {order.status === "pending" ? (
                    <button
                      className={styles.action}
                      type="button"
                      disabled={
                        busyOrderId === order.id ||
                        !preparationByOrder[String(order.id)]
                      }
                      onClick={() => void updateOrder(order, "confirm")}
                    >
                      Confirm order
                    </button>
                  ) : null}
                  {order.status === "confirmed" ? (
                    <button
                      className={styles.action}
                      type="button"
                      disabled={busyOrderId === order.id}
                      onClick={() => void updateOrder(order, "prepared")}
                    >
                      Mark as prepared
                    </button>
                  ) : null}
                  {notice?.url ? (
                    <a
                      className={styles.whatsapp}
                      href={notice.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FaWhatsapp aria-hidden /> Notify customer
                    </a>
                  ) : null}
                </div>
                {notice ? <p className={styles.notice}>{notice.message}</p> : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
