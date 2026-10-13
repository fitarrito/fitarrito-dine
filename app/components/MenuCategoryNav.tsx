"use client";

import Link from "next/link";
import Image from "next/image";
import styles from "./MenuCategoryNav.module.css";

export type DineInCategory = {
  id: string;
  label: string;
  imageUrl?: string;
  hidden?: boolean;
};

export const DINE_IN_CATEGORIES: DineInCategory[] = [
  {
    id: "soups",
    label: "Soups",
    imageUrl: "/images/soups-icon.png",
  },
  {
    id: "mexican",
    label: "Mexican",
    imageUrl: "/images/mexican-feast.png",
  },
  {
    id: "pan-asian",
    label: "Pan Asian",
    imageUrl: "/images/pan-asian-bowl.png",
  },
  {
    id: "asian-starters-gravy",
    label: "Asian Starters & Gravy",
    imageUrl: "/images/asian-starters-platter.png",
  },
  {
    id: "desserts",
    label: "Desserts",
    imageUrl: "/images/desserts-icon.png",
  },
  {
    id: "fitarrito-house",
    label: "Fitarrito House",
    imageUrl: "/images/fitarrito.svg",
    hidden: true,
  },
];

export const VISIBLE_DINE_IN_CATEGORIES = DINE_IN_CATEGORIES.filter(
  (category) => !category.hidden,
);

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
        {VISIBLE_DINE_IN_CATEGORIES.map((category) => {
          const active = activeCategory === category.id;
          const wideIcon = category.id !== "fitarrito-house";

          return (
            <Link
              key={category.id}
              href={`/menu?category=${category.id}`}
              className={`${styles.subItem} ${active ? styles.active : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {category.imageUrl ? (
                <span
                  className={`${styles.icon} ${wideIcon ? styles.iconWide : ""}`}
                >
                  <Image
                    src={category.imageUrl}
                    alt=""
                    width={wideIcon ? 96 : 28}
                    height={wideIcon ? 64 : 28}
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
