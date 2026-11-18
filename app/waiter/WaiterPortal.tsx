"use client";

import { useEffect, useState } from "react";
import {
  FaBookOpen,
  FaCheckCircle,
  FaChevronDown,
  FaClipboardList,
  FaCog,
  FaListAlt,
  FaUser,
} from "react-icons/fa";
import { readWaiterSubmittedOrders, type WaiterSubmittedOrder } from "@lib/waiterTableSession";
import QuickOrder from "./QuickOrder";
import styles from "./waiter.module.css";

const TABLES = Array.from({ length: 10 }, (_, index) => `T${index + 1}`);

const NAV_ITEMS = [
  { id: "new-order", label: "New Order", icon: FaClipboardList },
  { id: "ongoing", label: "Ongoing Orders", icon: FaListAlt },
  { id: "completed", label: "Completed Orders", icon: FaCheckCircle },
  { id: "menu", label: "Menu", icon: FaBookOpen },
  { id: "settings", label: "Settings", icon: FaCog },
] as const;

type SectionId = (typeof NAV_ITEMS)[number]["id"];

export default function WaiterPortal() {
  const [section, setSection] = useState<SectionId>("new-order");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <p className={styles.brand}>FITARRITO</p>
        <p className={styles.waiterLabel}>
          <FaUser aria-hidden />
          Waiter
          <FaChevronDown aria-hidden />
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
                onClick={() => setSection(item.id)}
              >
                <Icon aria-hidden />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className={section === "menu" ? styles.menuPanel : styles.panel}>
          {section === "new-order" ? (
            <>
              <h1>Start New Order</h1>
              <h2>Select Table Number</h2>
              <div className={styles.tables} role="listbox" aria-label="Table number">
                {TABLES.map((table) => {
                  const selected = selectedTable === table;

                  return (
                    <button
                      key={table}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`${styles.table} ${selected ? styles.tableSelected : ""}`}
                      onClick={() => setSelectedTable(table)}
                    >
                      {table}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className={styles.continue}
                disabled={selectedTable == null}
                onClick={() => setSection("menu")}
              >
                Continue
              </button>
            </>
          ) : section === "menu" ? (
            <QuickOrder table={selectedTable} onSelectTable={setSelectedTable} />
          ) : section === "ongoing" ? (
            <OngoingOrders />
          ) : (
            <p className={styles.comingSoon}>
              {NAV_ITEMS.find((item) => item.id === section)?.label} will be available here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function OngoingOrders() {
  const [orders, setOrders] = useState<WaiterSubmittedOrder[]>([]);

  useEffect(() => {
    setOrders(readWaiterSubmittedOrders());
  }, []);

  if (orders.length === 0) {
    return <p className={styles.comingSoon}>No orders have been submitted yet.</p>;
  }

  return (
    <div className={styles.orders}>
      {orders.map((order) => (
        <article key={order.id} className={styles.orderCard}>
          <h2>Table {order.table}</h2>
          <p>
            {new Date(order.submittedAt).toLocaleString("en-IN", {
              hour: "numeric",
              minute: "2-digit",
              day: "numeric",
              month: "short",
            })}
          </p>
          <ul>
            {order.lines.map((line, index) => (
              <li key={`${order.id}-${index}`}>
                {line.quantity} × {line.title}
                {line.detail ? ` · ${line.detail}` : ""}
              </li>
            ))}
          </ul>
          {order.notes ? <p>{order.notes}</p> : null}
          <strong>₹{Math.round(order.total).toLocaleString("en-IN")}</strong>
        </article>
      ))}
    </div>
  );
}
