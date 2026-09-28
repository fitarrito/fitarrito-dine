"use client";

import Image from "next/image";
import { FaHeart, FaLeaf } from "react-icons/fa";
import { GiMuscleUp } from "react-icons/gi";
import { MdRestaurant } from "react-icons/md";
import { resolveMenuItemImageUrl } from "@lib/menuImages";
import type { menuItem } from "@/types/types";
import SelectProtein from "./SelectProtein";
import styles from "./MenuItemDetails.module.css";

const FEATURES = [
  { icon: FaLeaf, label: "Fresh Ingredients", className: styles.featureIconGreen },
  {
    icon: GiMuscleUp,
    label: "High in Protein",
    className: styles.featureIconOrange,
  },
  {
    icon: MdRestaurant,
    label: "Customizable",
    className: styles.featureIconGreen,
  },
  { icon: FaHeart, label: "Great Taste", className: styles.featureIconRed },
];

type MenuItemDetailsProps = {
  card?: menuItem;
  index: number;
  onAddedToCart?: () => void;
};

export default function MenuItemDetails({
  card,
  onAddedToCart,
}: MenuItemDetailsProps) {
  if (!card) return null;

  const imageUrl = resolveMenuItemImageUrl(card);
  const hasProteinVariants = Boolean(
    card.proteinVariants && card.proteinVariants.length > 0,
  );

  return (
    <section className={styles.cardContainer}>
      <article className={styles.card}>
        <div className={styles.visualColumn}>
          <div className={styles.imageFrame}>
            <Image
              src={imageUrl}
              alt={card.title}
              fill
              className={styles.productImage}
              sizes="(max-width: 768px) 100vw, 420px"
              priority
            />
            <p className={styles.imageTagline}>
              Fresh • Wholesome • Delicious
            </p>
          </div>

          <ul className={styles.featureList}>
            {FEATURES.map(({ icon: Icon, label, className }) => (
              <li key={label} className={styles.featureItem}>
                <Icon className={className} aria-hidden />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.detailsColumn}>
          <h2 className={styles.title}>{card.title}</h2>
          {card.description ? (
            <p className={styles.description}>{card.description}</p>
          ) : null}

          {hasProteinVariants ? (
            <SelectProtein item={card} onAddedToCart={onAddedToCart} />
          ) : (
            <SelectProtein item={card} onAddedToCart={onAddedToCart} simple />
          )}
        </div>
      </article>
    </section>
  );
}
