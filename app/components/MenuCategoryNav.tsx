"use client";

import Link from "next/link";
import Image from "next/image";
import styles from "./MenuCategoryNav.module.css";

export type MenuCategory = {
  id: string;
  label: string;
  imageUrl?: string;
};

export const MENU_CATEGORIES: MenuCategory[] = [
  {
    id: "mexican",
    label: "Mexican",
    imageUrl: "/images/mexicanIcon.png",
  },
  {
    id: "pan-asian",
    label: "Pan Asian",
    imageUrl: "/images/koreanIcon.png",
  },
  { id: "drinks", label: "Drinks" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "nutrition-log", label: "Nutrition Log" },
  { id: "deals", label: "Deals" },
];

export const DEFAULT_MENU_CATEGORY = "mexican";

type MenuCategoryNavProps = {
  activeCategory: string;
};

export default function MenuCategoryNav({
  activeCategory,
}: MenuCategoryNavProps) {
  return (
    <nav className={styles.nav} aria-label="Menu categories">
      <div className={styles.scroll}>
        {MENU_CATEGORIES.map((category) => {
          const active = activeCategory === category.id;

          return (
            <Link
              key={category.id}
              href={`/menu?category=${category.id}`}
              className={`${styles.item} ${active ? styles.active : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {category.imageUrl ? (
                <span className={styles.icon}>
                  <Image
                    src={category.imageUrl}
                    alt=""
                    width={28}
                    height={28}
                    className={styles.iconImage}
                  />
                </span>
              ) : null}
              <span className={styles.label}>{category.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
