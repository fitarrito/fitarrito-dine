"use client";
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import Image from "next/image";
import styles from "./MenuItemDetails.module.css";
import { menuItem } from "@/types/types";
import SelectProtein from "./SelectProtein";
import { addToCart } from "@lib/features/cartSlice";
import { useAppDispatch } from "@lib/hooks";
// import ChooseVariantCard from "./ChooseVariantCard";

const DisplayTabContent: React.FC<{
  card?: menuItem;
  index: number;
  setNutrientData?: (data: {
    cals: number;
    protein: number;
    fat: number;
    carbs: number;
  }) => void; // ✅ Correct type
  onHover?: () => void;
  quantity?: number | undefined;
  isDrawerOpen?: () => void | undefined;
}> = ({ card, setNutrientData, onHover }) => {
  const dispatch = useAppDispatch();

  const [selectedProtein, setSelectedProtein] = useState<
    string | null | undefined
  >(null);
  const [selectedSize, setSelectedSize] = useState<"regular" | "jumbo">(
    "regular",
  );
  const hasProteinVariants =
    card?.proteinVariants && card.proteinVariants.length > 0;

  return (
    <section
      className={`${styles.cardContainer} ${
        hasProteinVariants ? styles.fullWidthCard : ""
      }`}
      onMouseEnter={onHover}
      onMouseLeave={() =>
        setNutrientData?.({
          cals: 0,
          protein: 0,
          fat: 0,
          carbs: 0,
        })
      }
    >
      <motion.article
        className={`${styles.card} ${
          hasProteinVariants ? styles.horizontalCard : ""
        }`}
        animate="rest"
        initial="rest"
        whileHover="hover"
      >
        {hasProteinVariants ? (
          <>
            {/* <div className={styles.horizontalImageWrapper}>
              <div className={styles.imageInner}>
                <Image
                  src={card?.imageUrl ?? "/fallback-image.jpg"}
                  alt={card?.title ?? "Menu image"}
                  fill
                  className={styles.containImage}
                />
              </div>
            </div> */}
            <div className={styles.horizontalImageWrapper}>
              <div className={styles.imageInner}>
                <Image
                  src={card?.imageUrl ?? "/fallback-image.jpg"}
                  alt={card?.title ?? "Menu image"}
                  fill
                  className={styles.containImage}
                />
                <div className={styles.addToCartOverlay}>
                  <button
                    className={styles.addToCartButton}
                    onClick={async () => {
                      const { meta } = await dispatch(
                        addToCart({
                          table_id: "table-1",
                          session_id: "session-1",
                          menu_item_id: card?.id,
                          imageUrl: card.imageUrl,
                          title: card.title,
                          image_url: card.imageUrl,
                          price: parseFloat(String(card?.price || 0)), // Use calculated price instead of base price
                          quantity: 1, // Use quantity from props (defaults to 1)
                          selected_protein: selectedProtein, // Store selected protein
                          selected_size: selectedSize, // Store selected size
                          // Store unique cart item ID
                        }),
                      );
                    }}
                  >
                    Add to cart
                  </button>
                </div>
              </div>
            </div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>{card?.title}</h3>

              <SelectProtein
                item={card || null}
                onPriceChange={(price, protein, size) => {
                  setSelectedProtein(protein);
                  setSelectedSize(size || "regular");
                }}
              />

              <div className={styles.mobileButtonWrap}>
                <button className={styles.primaryButton}>Add to cart</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={styles.imageWrapper}>
              <Image
                src={card?.imagesrc?.src ?? "/fallback-image.jpg"}
                alt={card?.title ?? "Menu image"}
                fill
                className={styles.coverImage}
              />
            </div>

            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>{card?.title}</h3>

              {/* <ChooseVariantCard item={card || null} /> */}

              <div className={styles.mobileButtonWrap}>
                <button className={styles.primaryButton}>Add to cart</button>
              </div>
            </div>
          </>
        )}
      </motion.article>
    </section>
  );
};

export default React.memo(DisplayTabContent);
