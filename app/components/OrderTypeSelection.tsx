"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaStore, FaClipboardList, FaShoppingBag } from "react-icons/fa";
import styles from "./OrderTypeSelection.module.css";

const DEFAULT_STORAGE_KEY = "fitarrito-order-type-default";

const ORDER_TYPES = [
  {
    id: "dine-in",
    label: "Dine In",
    href: "/menu?category=mexican",
    icon: FaStore,
  },
  {
    id: "meal-plans",
    label: "Meal Plans",
    href: "/subscription",
    icon: FaClipboardList,
  },
  {
    id: "order-now",
    label: "Order Now",
    href: "/menu?section=order-now",
    icon: FaShoppingBag,
  },
] as const;

export default function OrderTypeSelection() {
  const router = useRouter();
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedDefault = localStorage.getItem(DEFAULT_STORAGE_KEY);
    if (savedDefault) {
      const match = ORDER_TYPES.find((type) => type.id === savedDefault);
      if (match) {
        router.replace(match.href);
        return;
      }
    }
    setReady(true);
  }, [router]);

  const handleSelect = (id: string) => {
    if (setAsDefault) {
      localStorage.setItem(DEFAULT_STORAGE_KEY, id);
    }
  };

  if (!ready) {
    return null;
  }

  return (
    <section className={styles.orderTypePanel} aria-labelledby="order-type-title">
      <header className={styles.header}>
        <h1 id="order-type-title" className={styles.title}>
          Select Order Type
        </h1>
        <p className={styles.subtitle}>Choose your order type to proceed.</p>
      </header>

      <label className={styles.defaultOption}>
        <input
          type="checkbox"
          className={styles.defaultCheckbox}
          checked={setAsDefault}
          onChange={(event) => setSetAsDefault(event.target.checked)}
        />
        <span className={styles.defaultText}>
          <span className={styles.defaultLabel}>Set as default</span>
          <span className={styles.defaultHint}>
            Skip this selection next time.
          </span>
        </span>
      </label>

      <div className={styles.cards}>
        {ORDER_TYPES.map(({ id, label, href, icon: Icon }) => (
          <Link
            key={id}
            href={href}
            className={styles.card}
            onClick={() => handleSelect(id)}
          >
            <Icon className={styles.cardIcon} aria-hidden />
            <span className={styles.cardLabel}>{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
