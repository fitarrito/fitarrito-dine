"use client";

import Image from "next/image";
import styles from "./CuisineSelection.module.css";

export type Cuisine = {
  id: string;
  name: string;
  tagline: string;
  imageUrl: string;
  href: string;
};

export const CUISINES: Cuisine[] = [
  {
    id: "mexican",
    name: "Mexican",
    tagline: "Fresh. Bold. Flavorful.",
    imageUrl: "/images/mexicanIcon.png",
    href: "/menu",
  },
  {
    id: "korean",
    name: "Korean",
    tagline: "Authentic. Spicy. Soulful.",
    imageUrl: "/images/koreanIcon.png",
    href: "/korean",
  },
];

type CuisineSelectionProps = {
  selectedCuisineId: string;
  onSelect: (cuisine: Cuisine) => void;
};

export default function CuisineSelection({
  selectedCuisineId,
  onSelect,
}: CuisineSelectionProps) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>
        <span className={styles.sectionLine} aria-hidden />
        <span className={styles.sectionLabel}>Choose Cuisine</span>
        <span className={styles.sectionLine} aria-hidden />
      </h3>
      <div className={styles.grid}>
        {CUISINES.map((cuisine) => {
          const active = selectedCuisineId === cuisine.id;

          return (
            <button
              key={cuisine.id}
              type="button"
              className={`${styles.card} ${active ? styles.active : ""}`}
              onClick={() => onSelect(cuisine)}
              aria-pressed={active}
            >
              <span className={styles.icon}>
                <Image
                  src={cuisine.imageUrl}
                  alt={cuisine.name}
                  width={40}
                  height={40}
                  className={styles.iconImage}
                />
              </span>
              <span className={styles.content}>
                <span className={styles.name}>{cuisine.name}</span>
                <span className={styles.tagline}>{cuisine.tagline}</span>
              </span>
              <span
                className={`${styles.indicator} ${
                  active ? styles.checked : ""
                }`}
                aria-hidden
              >
                {active ? "✓" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
