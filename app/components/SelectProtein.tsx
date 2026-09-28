"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  FaChevronDown,
  FaInfoCircle,
  FaShoppingCart,
} from "react-icons/fa";
import { addToCart } from "@lib/features/cartSlice";
import { getCartSession } from "@lib/cartSession";
import { calculateMenuItemPricing } from "@lib/menuPricing";
import { useAppDispatch } from "@lib/hooks";
import { useOrderWindow } from "@lib/useOrderWindow";
import { resolveProteinImageUrl } from "@lib/menuImages";
import type { menuItem, ProteinVariant, SizeVariant } from "@/types/types";
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

  const sizeVariants = useMemo(
    () => item.sizeVariants ?? [],
    [item.sizeVariants],
  );
  const hasSizeVariants = sizeVariants.length > 0;

  const availableProteins = useMemo(
    () =>
      item.proteinVariants?.filter(
        (protein) => protein.name.toLowerCase() !== "mutton",
      ) ?? [],
    [item.proteinVariants],
  );

  const [selectedSizeName, setSelectedSizeName] = useState<string>(
    sizeVariants[0]?.name ?? "",
  );
  const [selectedProteinName, setSelectedProteinName] = useState<string>("");

  const pricing = calculateMenuItemPricing(
    item,
    selectedProteinName,
    hasSizeVariants ? selectedSizeName : null,
  );

  const selectionLabel = hasSizeVariants
    ? `${item.title} (${selectedSizeName})`
    : selectedProteinName
      ? `${item.title} (${selectedProteinName})`
      : item.title;

  const handleAddToCart = async () => {
    if (orderWindow === "closed") return;
    if (hasSizeVariants && !selectedSizeName) return;
    if (!simple && availableProteins.length > 0 && !selectedProteinName) return;

    const session = getCartSession();

    await dispatch(
      addToCart({
        sessionId: session.sessionId,
        menuItemId: String(item.id),
        selectedProtein:
          selectedProteinName || availableProteins[0]?.name || "Default",
        selectedSize: hasSizeVariants ? selectedSizeName : undefined,
        quantity: 1,
      }),
    );

    onAddedToCart?.();
  };

  const renderSizeCard = (size: SizeVariant) => {
    const active = selectedSizeName === size.name;
    const sizePrice = parseFloat(String(size.price || 0));

    return (
      <button
        key={size.name}
        type="button"
        className={`${styles.sizeCard} ${active ? styles.sizeCardActive : ""}`}
        onClick={() => setSelectedSizeName(size.name)}
        aria-pressed={active}
      >
        <span
          className={`${styles.sizeRadio} ${active ? styles.sizeRadioActive : ""}`}
          aria-hidden
        />
        <span className={styles.sizeName}>{size.name}</span>
        <span className={styles.sizePrice}>{formatRupee(sizePrice)}</span>
      </button>
    );
  };

  const renderProteinChip = (protein: ProteinVariant) => {
    const active = selectedProteinName === protein.name;
    const proteinImage = resolveProteinImageUrl(protein.imageUrl);

    return (
      <button
        key={protein.name}
        type="button"
        className={`${styles.proteinChip} ${active ? styles.proteinChipActive : ""}`}
        onClick={() => setSelectedProteinName(protein.name)}
        aria-pressed={active}
      >
        {proteinImage ? (
          <Image
            src={proteinImage}
            alt=""
            width={22}
            height={22}
            className={styles.proteinChipIcon}
          />
        ) : null}
        <span>{protein.name}</span>
      </button>
    );
  };

  return (
    <section className={styles.wrapper}>
      {hasSizeVariants ? (
        <section className={styles.sizeSection}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionEmoji} aria-hidden>
              🌯
            </span>
            <h3 className={styles.sectionTitle}>Select Size</h3>
          </div>

          <div className={styles.sizeGrid}>
            {sizeVariants.map(renderSizeCard)}
          </div>
        </section>
      ) : null}

      {!simple && availableProteins.length > 0 ? (
        <section className={styles.proteinSection}>
          <div className={styles.proteinHeader}>
            <h3 className={styles.proteinTitle}>
              Choose Protein <span className={styles.required}>*</span>
            </h3>
            <button type="button" className={styles.includedLink}>
              <FaInfoCircle aria-hidden />
              What&apos;s included?
            </button>
          </div>

          <div className={styles.proteinSelectWrap}>
            <select
              value={selectedProteinName}
              onChange={(event) => setSelectedProteinName(event.target.value)}
              className={
                selectedProteinName
                  ? styles.proteinSelect
                  : styles.proteinSelectPlaceholder
              }
              required
            >
              <option value="">Select your protein</option>
              {availableProteins.map((protein) => (
                <option key={protein.name} value={protein.name}>
                  {protein.name}
                </option>
              ))}
            </select>
            <FaChevronDown className={styles.proteinSelectIcon} aria-hidden />
          </div>

          <div className={styles.proteinGrid}>
            {availableProteins.map(renderProteinChip)}
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
          <p className={styles.totalValue}>{formatRupee(pricing.price)}</p>
        </div>

        <button
          type="button"
          className={`${styles.addToCartButton} ${
            orderWindow === "closed" ? styles.addToCartButtonClosed : ""
          }`}
          onClick={() => void handleAddToCart()}
          disabled={
            orderWindow === "closed" ||
            (hasSizeVariants && !selectedSizeName) ||
            (!simple &&
              availableProteins.length > 0 &&
              !selectedProteinName)
          }
        >
          {orderWindow === "closed" ? null : <FaShoppingCart aria-hidden />}
          {orderWindow === "closed" ? "Ordering Closed" : "Add to Cart"}
        </button>
      </div>
    </section>
  );
}
