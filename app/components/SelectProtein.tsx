"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { menuItem, ProteinVariant } from "@/types/types";
import styles from "./SelectProtein.module.css";

interface ChooseVariantCardProps {
  item: menuItem | null;
  onPriceChange?: (
    price: number,
    selectedProtein?: string,
    size?: "regular" | "jumbo",
  ) => void;
}

const ChooseVariantCard: React.FC<ChooseVariantCardProps> = ({
  item,
  onPriceChange,
}) => {
  const [variant, setVariant] = useState<"regular" | "jumbo">("regular");

  const [selectedProtein, setSelectedProtein] = useState<string | null>(
    item?.proteinVariants?.length ? item.proteinVariants[0].name : null,
  );

  const totalPrice = useMemo(() => {
    const basePrice = parseFloat(String(item?.price || 0));

    if (item?.proteinVariants && selectedProtein) {
      const protein = item.proteinVariants.find(
        (p) => p.name === selectedProtein,
      );

      const sizeVariant = item?.title?.toLowerCase().includes("taco")
        ? "regular"
        : variant;

      const proteinPrice = parseFloat(
        protein?.nutrient[sizeVariant].price || "0",
      );

      return basePrice + proteinPrice;
    }

    return basePrice;
  }, [item, selectedProtein, variant]);

  useEffect(() => {
    if (onPriceChange) {
      const sizeVariant = item?.title?.toLowerCase().includes("taco")
        ? "regular"
        : variant;

      onPriceChange(totalPrice, selectedProtein || undefined, sizeVariant);
    }
  }, [totalPrice, selectedProtein, variant, item, onPriceChange]);

  const hasSizeVariants = useMemo(() => {
    if (item?.title?.toLowerCase().includes("taco")) return false;

    if (item?.proteinVariants?.length) {
      return item.proteinVariants.some(
        (protein) =>
          protein.nutrient.regular.price !== protein.nutrient.jumbo.price,
      );
    }

    if (!item?.nutrient) return false;

    return item.nutrient.regular?.price !== item.nutrient.jumbo?.price;
  }, [item]);

  const { vegProteins, nonVegProteins } = useMemo(() => {
    if (!item?.proteinVariants) {
      return { vegProteins: [], nonVegProteins: [] };
    }

    return {
      vegProteins: item.proteinVariants.filter((p) => p.type === "veg"),
      nonVegProteins: item.proteinVariants.filter((p) => p.type === "non-veg"),
    };
  }, [item]);

  const renderProteinButtons = (
    proteins: ProteinVariant[],
    type: "veg" | "non-veg",
  ) => {
    if (!proteins.length) return null;
    return (
      <section className={styles.proteinGroup}>
        <header className={styles.proteinHeader}>
          {proteins[0]?.imageUrl && (
            <div className={styles.iconWrap}>
              <Image
                src={proteins[0].imageUrl}
                alt={proteins[0].name}
                fill
                className={styles.iconImage}
              />
            </div>
          )}

          <p className={styles.groupTitle}>
            {type === "veg" ? "Vegetarian" : "Non-Vegetarian"}
          </p>
        </header>

        <div className={styles.buttonGroup}>
          {proteins.map((protein) => {
            const active = selectedProtein === protein.name;

            return (
              <button
                key={protein.name}
                type="button"
                onClick={() => setSelectedProtein(protein.name)}
                className={`${styles.proteinButton} ${
                  active ? styles.activeProtein : ""
                }`}
              >
                {protein.imageUrl ? (
                  <span className={styles.iconWrap}>
                    <Image
                      src={protein.imageUrl}
                      alt={protein.name}
                      fill
                      className={styles.iconImage}
                    />
                  </span>
                ) : (
                  <span
                    className={`${styles.dot} ${
                      protein.type === "veg" ? styles.vegDot : styles.nonVegDot
                    }`}
                  />
                )}

                {protein.name}
              </button>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <section className={styles.wrapper}>
      {item?.proteinVariants?.length > 0 && (
        <section className={styles.proteinSection}>
          <h4 className={styles.chooseTitle}>Choose Protein:</h4>

          <div className={styles.proteinLayout}>
            {renderProteinButtons(vegProteins, "veg")}
            {renderProteinButtons(nonVegProteins, "non-veg")}
          </div>
        </section>
      )}

      <p className={styles.price}>Rs.{totalPrice}</p>

      {hasSizeVariants && (
        <section className={styles.sizeSection}>
          <label className={styles.sizeLabel}>
            <input
              type="radio"
              checked={variant === "regular"}
              onChange={() => setVariant("regular")}
            />
            <span>Regular</span>
          </label>

          <label className={styles.sizeLabel}>
            <input
              type="radio"
              checked={variant === "jumbo"}
              onChange={() => setVariant("jumbo")}
            />
            <span>Jumbo</span>
          </label>
        </section>
      )}
    </section>
  );
};

export default ChooseVariantCard;
