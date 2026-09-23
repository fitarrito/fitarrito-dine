"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { FaCheck, FaInfoCircle, FaShoppingCart, FaTag } from "react-icons/fa";
import { addToCart } from "@lib/features/cartSlice";
import { getCartSession } from "@lib/cartSession";
import { useAppDispatch } from "@lib/hooks";
import { useOrderWindow } from "@lib/useOrderWindow";
import type { menuItem, ProteinVariant } from "@/types/types";
import styles from "./SelectProtein.module.css";

type SelectProteinProps = {
  item: menuItem;
  onAddedToCart?: () => void;
  simple?: boolean;
};

function formatRupee(amount: number) {
  return `₹${Math.round(amount)}`;
}

export default function SelectProtein({
  item,
  onAddedToCart,
  simple = false,
}: SelectProteinProps) {
  const dispatch = useAppDispatch();
  const orderWindow = useOrderWindow();

  const availableProteins = useMemo(
    () =>
      item.proteinVariants?.filter(
        (protein) => protein.name.toLowerCase() !== "mutton",
      ) ?? [],
    [item.proteinVariants],
  );

  const [selectedProteinName, setSelectedProteinName] = useState<string>(
    availableProteins[0]?.name ?? "",
  );

  const basePrice = parseFloat(String(item.price || 0));

  const selectedProtein = availableProteins.find(
    (protein) => protein.name === selectedProteinName,
  );

  const proteinAddon = parseFloat(String(selectedProtein?.price || 0));
  const totalPrice = basePrice + proteinAddon;

  const handleAddToCart = async () => {
    if (orderWindow === "closed") return;

    const session = getCartSession();

    if (!selectedProteinName) return;

    await dispatch(
      addToCart({
        sessionId: session.sessionId,
        menuItemId: String(item.id),
        selectedProtein: selectedProteinName,
        quantity: 1,
      }),
    );

    onAddedToCart?.();
  };

  const renderProteinCard = (protein: ProteinVariant) => {
    const active = selectedProteinName === protein.name;
    const addonPrice = parseFloat(String(protein.price || 0));

    return (
      <button
        key={protein.name}
        type="button"
        className={`${styles.proteinCard} ${active ? styles.proteinCardActive : ""}`}
        onClick={() => setSelectedProteinName(protein.name)}
        aria-pressed={active}
      >
        {active ? (
          <span className={styles.checkBadge} aria-hidden>
            <FaCheck />
          </span>
        ) : null}

        {protein.imageUrl ? (
          <span className={styles.proteinIconWrap}>
            <Image
              src={protein.imageUrl}
              alt=""
              width={28}
              height={28}
              className={styles.proteinIcon}
            />
          </span>
        ) : null}

        <span className={styles.proteinName}>{protein.name}</span>
        <span className={styles.proteinPrice}>+ {formatRupee(addonPrice)}</span>
      </button>
    );
  };

  const selectionLabel = selectedProteinName
    ? `${item.title} + ${selectedProteinName}`
    : item.title;

  return (
    <section className={styles.wrapper}>
      <div className={styles.basePriceBox}>
        <FaTag className={styles.basePriceIcon} aria-hidden />
        <div>
          <p className={styles.basePriceLabel}>Base Price</p>
          <p className={styles.basePriceValue}>{formatRupee(basePrice)}</p>
        </div>
      </div>

      {!simple && availableProteins.length > 0 ? (
        <section className={styles.proteinSection}>
          <div className={styles.proteinHeader}>
            <h3 className={styles.proteinTitle}>Choose Your Protein</h3>
            <button type="button" className={styles.includedLink}>
              <FaInfoCircle aria-hidden />
              What&apos;s included?
            </button>
          </div>

          <div className={styles.proteinGrid}>
            {availableProteins.map(renderProteinCard)}
          </div>
        </section>
      ) : null}

      <div className={styles.summaryBar}>
        <div className={styles.summaryText}>
          <p className={styles.summaryLabel}>Your Selection</p>
          <p className={styles.summaryValue}>{selectionLabel}</p>
        </div>

        <div className={styles.summaryPricing}>
          <p className={styles.totalLabel}>Total Price</p>
          <p className={styles.totalValue}>{formatRupee(totalPrice)}</p>
        </div>

        <button
          type="button"
          className={styles.addToCartButton}
          onClick={() => void handleAddToCart()}
          disabled={orderWindow === "closed"}
        >
          {orderWindow === "closed" ? null : <FaShoppingCart aria-hidden />}
          {orderWindow === "closed" ? "Ordering Closed" : "Add to Cart"}
        </button>
      </div>
    </section>
  );
}
