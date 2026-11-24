"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FaBookOpen,
  FaCheckCircle,
  FaClipboardList,
  FaCog,
  FaListAlt,
  FaUser,
} from "react-icons/fa";
import { fetchJson } from "@lib/apiFetch";
import QuickOrder from "./QuickOrder";
import styles from "./waiter.module.css";

const NAV_ITEMS = [
  { id: "tables", label: "New Order", icon: FaClipboardList },
  { id: "ongoing", label: "Ongoing Orders", icon: FaListAlt },
  { id: "history", label: "Completed Orders", icon: FaCheckCircle },
  { id: "menu", label: "Menu", icon: FaBookOpen },
  { id: "settings", label: "Settings", icon: FaCog },
] as const;

type SectionId = (typeof NAV_ITEMS)[number]["id"] | "settle";
type TableStatus = "available" | "open" | "preparing" | "served" | "settled";
type OrderFilter = "all" | "open" | "preparing" | "served";

type TableCard = {
  id: string;
  tableNumber: number;
  label: string;
  status: TableStatus;
  orderId: number | null;
  itemCount: number;
  total: number | null;
  openedAt: string | null;
  paymentStatus: "Unpaid" | "Paid";
};

type OrderLine = {
  id: number;
  title: string;
  quantity: number;
  price: number;
  selected_protein: string | null;
  selected_size: string | null;
  item_format: string | null;
};

type TableOrder = {
  id: number;
  tableNumber: number;
  tableLabel: string;
  status: Exclude<TableStatus, "available">;
  createdAt: string | null;
  waiterName: string;
  notes: string | null;
  paymentStatus: "Unpaid" | "Paid";
  paymentMethod: string | null;
  subtotal: number;
  gst: number;
  total: number;
  items: OrderLine[];
};

function money(amount: number) {
  const rounded = Math.round((Number(amount) || 0) * 100) / 100;

  return Number.isInteger(rounded)
    ? `₹${rounded.toLocaleString("en-IN")}`
    : `₹${rounded.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusText(status: TableStatus) {
  if (status === "available") return "Available";
  if (status === "open") return "Open";
  if (status === "preparing") return "Preparing";
  if (status === "served") return "Served";

  return "Settled";
}

function elapsed(value: string | null) {
  if (!value) return "";

  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);

  return `${hours} hr ${minutes % 60} min`;
}

function lineDetail(line: OrderLine) {
  return [line.selected_size, line.selected_protein, line.item_format].filter(Boolean).join(" · ");
}

export default function WaiterPortal() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [waiterName, setWaiterName] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [section, setSection] = useState<SectionId>("tables");
  const [tables, setTables] = useState<TableCard[]>([]);
  const [orders, setOrders] = useState<TableOrder[]>([]);
  const [history, setHistory] = useState<TableOrder[]>([]);
  const [order, setOrder] = useState<TableOrder | null>(null);
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadTables = useCallback(async () => {
    const result = await fetchJson<{ tables: TableCard[] }>("/api/waiter/tables");
    setTables(result.tables);
  }, []);

  const loadOrders = useCallback(async (scope: "active" | "settled") => {
    const result = await fetchJson<{ orders: TableOrder[] }>(
      `/api/waiter/orders?scope=${scope}`,
    );

    if (scope === "settled") setHistory(result.orders);
    else setOrders(result.orders);
  }, []);

  useEffect(() => {
    fetchJson<{ authenticated: boolean; name: string | null }>("/api/waiter/session")
      .then((session) => {
        setAuthenticated(session.authenticated);
        setWaiterName(session.name ?? "");
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to open the waiter portal.");
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    const task =
      section === "tables"
        ? loadTables()
        : section === "ongoing"
          ? loadOrders("active")
          : section === "history"
            ? loadOrders("settled")
            : Promise.resolve();

    task.catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to refresh.");
    });
  }, [authenticated, loadOrders, loadTables, section]);

  async function signIn() {
    setBusy(true);
    setError(null);

    try {
      const result = await fetchJson<{ name: string }>("/api/waiter/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      setWaiterName(result.name);
      setAuthenticated(true);
      setPassword("");
      setSection("tables");
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetchJson("/api/waiter/session", { method: "DELETE" });
    setAuthenticated(false);
    setOrder(null);
    setSection("tables");
  }

  async function chooseTable(table: TableCard) {
    setBusy(true);
    setError(null);

    try {
      const result = await fetchJson<{ order: TableOrder }>("/api/waiter/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber: table.tableNumber }),
      });
      setOrder(result.order);
      setSection(result.order.items.length > 0 ? "menu" : "menu");
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Unable to open this table.");
    } finally {
      setBusy(false);
    }
  }

  async function chooseTableLabel(label: string) {
    const tableNumber = Number(label.replace(/\D/g, ""));
    const known = tables.find((table) => table.tableNumber === tableNumber);

    await chooseTable(
      known ?? {
        id: label,
        tableNumber,
        label,
        status: "available",
        orderId: null,
        itemCount: 0,
        total: null,
        openedAt: null,
        paymentStatus: "Unpaid",
      },
    );
  }

  if (!ready) {
    return <p className={styles.comingSoon}>Loading waiter portal...</p>;
  }

  if (!authenticated) {
    return (
      <form
        className={styles.login}
        onSubmit={(event) => {
          event.preventDefault();
          void signIn();
        }}
      >
        <p className={styles.brand}>FITARRITO</p>
        <h1>Waiter sign in</h1>
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className={styles.error}>{error}</p> : null}
        <button type="submit" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    );
  }

  const visibleOrders = orders.filter((entry) => filter === "all" || entry.status === filter);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <p className={styles.brand}>FITARRITO</p>
        <p className={styles.waiterLabel}>
          <FaUser aria-hidden />
          {waiterName || "Waiter"}
        </p>
      </header>
      <div className={styles.body}>
        <nav className={styles.nav} aria-label="Waiter">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  setError(null);
                  if (item.id === "menu" && !order) {
                    setSection("tables");
                    return;
                  }
                  setSection(item.id);
                }}
              >
                <Icon aria-hidden />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className={section === "menu" ? styles.menuPanel : styles.panel}>
          {error ? <p className={styles.error}>{error}</p> : null}
          {section === "tables" ? (
            <>
              <h1>Select table</h1>
              <p className={styles.lead}>
                Open tables keep their order until the bill is settled.
              </p>
              <div className={styles.tables} role="listbox" aria-label="Tables">
                {tables.map((table) => (
                  <button
                    key={table.id}
                    type="button"
                    className={`${styles.table} ${styles[`table_${table.status}`]}`}
                    onClick={() => void chooseTable(table)}
                    disabled={busy}
                  >
                    <strong>{table.label}</strong>
                    <span>{statusText(table.status)}</span>
                    <small>
                      {table.status === "available"
                        ? "No active order"
                        : `${table.itemCount} ${table.itemCount === 1 ? "item" : "items"}`}
                    </small>
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {section === "menu" && order ? (
            <QuickOrder
              table={order.tableLabel}
              orderId={order.id}
              onSelectTable={(label) => void chooseTableLabel(label)}
              onHeld={() => {
                setSection("tables");
                void loadTables();
              }}
              onSettle={() => setSection("settle")}
            />
          ) : null}
          {section === "ongoing" ? (
            <>
              <h1>Ongoing orders</h1>
              <div className={styles.filters}>
                {(["all", "open", "preparing", "served"] as const).map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    className={filter === entry ? styles.filterActive : undefined}
                    onClick={() => setFilter(entry)}
                  >
                    {entry === "all" ? "All active" : statusText(entry)}
                  </button>
                ))}
              </div>
              {visibleOrders.length === 0 ? (
                <p className={styles.comingSoon}>No open table orders.</p>
              ) : (
                <div className={styles.orders}>
                  {visibleOrders.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      className={styles.orderCard}
                      onClick={() => {
                        setOrder(entry);
                        setSection("menu");
                      }}
                    >
                      <h2>
                        {entry.tableLabel} · Order #{entry.id}
                      </h2>
                      <p>
                        {statusText(entry.status)} · {entry.paymentStatus} · {elapsed(entry.createdAt)}
                      </p>
                      <p>
                        {entry.items.reduce((sum, line) => sum + line.quantity, 0)} items
                      </p>
                      <strong>{money(entry.total)}</strong>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : null}
          {section === "history" ? (
            <>
              <h1>Settled orders</h1>
              {history.length === 0 ? (
                <p className={styles.comingSoon}>No settled table orders yet.</p>
              ) : (
                <div className={styles.orders}>
                  {history.map((entry) => (
                    <article key={entry.id} className={styles.orderCard}>
                      <h2>
                        {entry.tableLabel} · Order #{entry.id}
                      </h2>
                      <p>
                        {entry.paymentMethod === "qr" ? "QR" : "Cash"} · {entry.paymentStatus}
                      </p>
                      <ul>
                        {entry.items.map((line) => (
                          <li key={line.id}>
                            {line.quantity} × {line.title}
                            {lineDetail(line) ? ` · ${lineDetail(line)}` : ""}
                          </li>
                        ))}
                      </ul>
                      <strong>{money(entry.total)}</strong>
                    </article>
                  ))}
                </div>
              )}
            </>
          ) : null}
          {section === "settle" && order ? (
            <SettleTable
              orderId={order.id}
              onDone={() => {
                setOrder(null);
                setSection("tables");
                void loadTables();
              }}
              onBack={() => setSection("menu")}
            />
          ) : null}
          {section === "settings" ? (
            <>
              <h1>Settings</h1>
              <p className={styles.lead}>Signed in as {waiterName}.</p>
              <button type="button" className={styles.continue} onClick={() => void signOut()}>
                Sign out
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SettleTable({
  orderId,
  onDone,
  onBack,
}: {
  orderId: number;
  onDone: () => void;
  onBack: () => void;
}) {
  const [order, setOrder] = useState<TableOrder | null>(null);
  const [method, setMethod] = useState<"cash" | "qr">("cash");
  const [received, setReceived] = useState("");
  const [reference, setReference] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchJson<{ order: TableOrder }>(`/api/waiter/orders/${orderId}`)
      .then((result) => {
        setOrder(result.order);
        setReceived(String(result.order.total));
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load the bill.");
      });
  }, [orderId]);

  async function settle() {
    if (!order) return;

    setBusy(true);
    setError(null);

    try {
      await fetchJson(`/api/waiter/orders/${order.id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          amountReceived: method === "cash" ? Number(received) : order.total,
          transactionReference: reference,
          confirmed,
        }),
      });
      onDone();
    } catch (settleError) {
      setError(settleError instanceof Error ? settleError.message : "Unable to settle this table.");
    } finally {
      setBusy(false);
    }
  }

  if (!order) return <p className={styles.comingSoon}>{error ?? "Loading bill..."}</p>;

  return (
    <div className={styles.settle}>
      <button type="button" className={styles.textButton} onClick={onBack}>
        Back to order
      </button>
      <h1>Settle {order.tableLabel}</h1>
      <p className={styles.lead}>
        Order #{order.id} · {order.waiterName} · {order.paymentStatus}
      </p>
      <ul className={styles.bill}>
        {order.items.map((line) => (
          <li key={line.id}>
            <span>
              {line.quantity} × {line.title}
              {lineDetail(line) ? <small>{lineDetail(line)}</small> : null}
            </span>
            <strong>{money(line.price * line.quantity)}</strong>
          </li>
        ))}
      </ul>
      <dl className={styles.billTotals}>
        <div>
          <dt>Subtotal</dt>
          <dd>{money(order.subtotal)}</dd>
        </div>
        <div>
          <dt>GST (5%)</dt>
          <dd>{money(order.gst)}</dd>
        </div>
        <div>
          <dt>Delivery</dt>
          <dd>Not applicable</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{money(order.total)}</dd>
        </div>
      </dl>
      <div className={styles.payMethods}>
        <button type="button" aria-pressed={method === "cash"} onClick={() => setMethod("cash")}>
          Cash
        </button>
        <button type="button" aria-pressed={method === "qr"} onClick={() => setMethod("qr")}>
          Scan & Pay (QR)
        </button>
      </div>
      {method === "cash" ? (
        <label className={styles.field}>
          Cash received
          <input
            inputMode="decimal"
            value={received}
            onChange={(event) => setReceived(event.target.value)}
          />
        </label>
      ) : (
        <label className={styles.field}>
          Transaction reference
          <input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Optional, after you verify the payment"
          />
        </label>
      )}
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        I have confirmed this {method === "cash" ? "cash" : "QR"} payment
      </label>
      {error ? <p className={styles.error}>{error}</p> : null}
      <button
        type="button"
        className={styles.continue}
        disabled={busy || !confirmed || order.items.length === 0}
        onClick={() => void settle()}
      >
        {busy ? "Settling..." : "Settle & Close Table"}
      </button>
    </div>
  );
}
