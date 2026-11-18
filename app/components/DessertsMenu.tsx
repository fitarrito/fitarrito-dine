"use client";

import { useMemo } from "react";
import { sortDessertDishes } from "@lib/desserts";
import type { menuItem } from "@/types/types";
import VariantMenuCard from "./VariantMenuCard";
import styles from "./SoupsMenu.module.css";

function DessertMark() {
  return (
    <svg className={styles.kickerIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 14c0-3 2.2-5 5-5s5 2 5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M6 14.5h12c.2 2.6-1.4 4.5-6 4.5s-6.2-1.9-6-4.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type DessertsMenuProps = {
  items: menuItem[];
  onAddedToCart?: () => void;
};

export default function DessertsMenu({ items, onAddedToCart }: DessertsMenuProps) {
  const desserts = useMemo(
    () =>
      sortDessertDishes(
        items.filter((item) => (item.order_type ?? "on_demand") === "on_demand"),
      ),
    [items],
  );

  return (
    <section className={styles.section}>
      <header className={styles.heading}>
        <h2>Desserts</h2>
        <p>House desserts, made to order.</p>
      </header>
      {desserts.length > 0 ? (
        <div className={styles.list}>
          {desserts.map((item) => (
            <VariantMenuCard
              key={item.id}
              item={item}
              kicker="Desserts"
              icon={<DessertMark />}
              mode="dessert"
              onAddedToCart={onAddedToCart}
            />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>Desserts are not available right now.</p>
      )}
    </section>
  );
}
