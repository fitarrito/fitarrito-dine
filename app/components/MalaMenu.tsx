"use client";

import { useMemo } from "react";
import { isMalaCategoryName, sortMalaDishes } from "@lib/mala";
import type { menuItem } from "@/types/types";
import cardStyles from "./SoupsMenu.module.css";
import { PanAsianMenuCard } from "./PanAsianMenu";

type FoodCategory = {
  id: number;
  name: string;
};

export default function MalaMenu({
  items,
  categories = [],
  onAddedToCart,
}: {
  items: menuItem[];
  categories?: FoodCategory[];
  onAddedToCart?: () => void;
}) {
  const dishes = useMemo(() => {
    const malaCategory = categories.find((category) => isMalaCategoryName(category.name));

    if (!malaCategory) return [];

    return sortMalaDishes(
      items.filter((item) => {
        if ((item.order_type ?? "on_demand") !== "on_demand") return false;

        return Number(item.categoryId) === Number(malaCategory.id);
      }),
    );
  }, [categories, items]);

  return (
    <section className={cardStyles.section}>
      <header className={cardStyles.heading}>
        <h2>Mala</h2>
        <p>Numbing, spicy bowls.</p>
      </header>
      {dishes.length > 0 ? (
        <div className={cardStyles.list}>
          {dishes.map((item) => (
            <PanAsianMenuCard
              key={item.id}
              item={item}
              kicker="Mala"
              onAddedToCart={onAddedToCart}
            />
          ))}
        </div>
      ) : (
        <p className={cardStyles.empty}>Mala bowls are not available right now.</p>
      )}
    </section>
  );
}
