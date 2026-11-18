"use client";

import { useMemo } from "react";
import type { menuItem } from "@/types/types";
import VariantMenuCard from "./VariantMenuCard";
import styles from "./SoupsMenu.module.css";

type BeveragesMenuProps = {
  items: menuItem[];
  onAddedToCart?: () => void;
};

export default function BeveragesMenu({ items, onAddedToCart }: BeveragesMenuProps) {
  const drinks = useMemo(
    () =>
      items
        .filter((item) => (item.order_type ?? "on_demand") === "on_demand")
        .slice()
        .sort((left, right) => left.title.localeCompare(right.title)),
    [items],
  );

  return (
    <section className={styles.section} aria-label="Beverages">
      <header className={styles.heading}>
        <h2>Beverages</h2>
        <p>Hot and iced teas.</p>
      </header>
      {drinks.length > 0 ? (
        <div className={styles.list}>
          {drinks.map((item) => (
            <VariantMenuCard
              key={item.id}
              item={item}
              kicker="Beverages"
              mode={(item.proteinVariants?.length ?? 0) > 0 ? "protein" : "fixed"}
              onAddedToCart={onAddedToCart}
            />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>Beverages are not available right now.</p>
      )}
    </section>
  );
}
