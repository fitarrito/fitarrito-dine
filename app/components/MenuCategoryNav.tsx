"use client";

import Link from "next/link";
import Image from "next/image";
import styles from "./MenuCategoryNav.module.css";

export type DineInCategory = {
  id: string;
  label: string;
  imageUrl?: string;
};

export const DINE_IN_CATEGORIES: DineInCategory[] = [
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
];

export const DEFAULT_MENU_CATEGORY = "mexican";

/** @deprecated Use DINE_IN_CATEGORIES */
export const MENU_CATEGORIES = DINE_IN_CATEGORIES;

type MenuCategoryNavProps = {
  activeCategory?: string;
};

export default function MenuCategoryNav({
  activeCategory = DEFAULT_MENU_CATEGORY,
}: MenuCategoryNavProps) {
  return (
    <nav className={styles.nav} aria-label="Dine-in categories">
      <div className={styles.subRow}>
        {DINE_IN_CATEGORIES.map((category) => {
          const active = activeCategory === category.id;

          return (
            <Link
              key={category.id}
              href={`/menu?category=${category.id}`}
              className={`${styles.subItem} ${active ? styles.active : ""}`}
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
