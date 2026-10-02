"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FaWhatsapp } from "react-icons/fa";
import logo from "../../../public/images/logo.svg";
import { fetchJson } from "@lib/apiFetch";
import { formatRupees } from "@lib/razorpayFee";
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

  const loadOrders = async () => {
    const result = await fetchJson<{ orders: StaffOrder[] }>("/api/staff/orders");
    setOrders(result.orders);
  };

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
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    const intervalId = window.setInterval(() => {
      void loadOrders().catch(() => undefined);
    }, 20000);

    return () => window.clearInterval(intervalId);
  }, [authenticated]);

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
  };

  const updateOrder = async (
    order: StaffOrder,
    action: "confirm" | "prepared",
  ) => {
    setBusyOrderId(order.id);
    setError(null);

    try {
      const result = await fetchJson<{
        status: string;
        notification: Notification;
      }>("/api/staff/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          action,
          preparationMinutes: preparationByOrder[String(order.id)],
        }),
      });

      setNotices((current) => ({
        ...current,
        [String(order.id)]: result.notification,
      }));
      await loadOrders();
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
    filter === "active" ? true : order.status === filter,
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
        <button className={styles.logout} type="button" onClick={() => void signOut()}>
          Sign out
        </button>
      </header>

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
        <p className={styles.empty}>No on-demand orders in this view.</p>
      ) : (
        <div className={styles.orders}>
          {visibleOrders.map((order) => {
            const notice = notices[String(order.id)];

            return (
              <article className={styles.orderCard} key={order.id}>
                <header className={styles.orderHeader}>
                  <div>
                    <h2>Order #{order.id}</h2>
                    <p className={styles.meta}>{order.customerName}</p>
                  </div>
                  <span className={styles.badge}>{statusLabel(order.status)}</span>
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
