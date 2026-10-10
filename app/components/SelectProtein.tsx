"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  FaChevronDown,
  FaInfoCircle,
  FaShoppingCart,
  FaSpinner,
} from "react-icons/fa";
import { addToCart } from "@lib/features/cartSlice";
import { getCartSession } from "@lib/cartSession";
import {
  calculateMenuItemPricing,
  getAvailableProteinVariants,
} from "@lib/menuPricing";
import { quoteSizePrice } from "@lib/mexicanMiniOffer";
import { useAppDispatch } from "@lib/hooks";
import { orderingActionsPaused, useOnlineOrdering } from "@lib/useOnlineOrdering";
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
  const ordering = useOnlineOrdering();
  const orderingPaused = orderingActionsPaused(ordering.enabled);

  const sizeVariants = useMemo(
    () => item.sizeVariants ?? [],
    [item.sizeVariants],
  );
  const hasSizeVariants = sizeVariants.length > 0;

  const [selectedSizeName, setSelectedSizeName] = useState<string>(
    sizeVariants[0]?.name ?? "",
  );
  const [selectedProteinName, setSelectedProteinName] = useState<string>("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const availableProteins = getAvailableProteinVariants(item, selectedSizeName);

  useEffect(() => {
    if (
      selectedProteinName &&
      !availableProteins.some((protein) => protein.name === selectedProteinName)
    ) {
      setSelectedProteinName("");
    }
  }, [availableProteins, selectedProteinName]);

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

  const selectSize = (sizeName: string) => {
    setSelectedSizeName(sizeName);
    setActionError(null);

    if (
      sizeName.trim().toLowerCase() === "mini" &&
      selectedProteinName.trim().toLowerCase() === "prawn"
    ) {
      setSelectedProteinName("");
    }
  };

  const handleAddToCart = async () => {
    if (orderingPaused || isAdding) return;
    if (hasSizeVariants && !selectedSizeName) {
      setActionError("Please select a size.");
      return;
    }
    if (!simple && availableProteins.length > 0 && !selectedProteinName) {
      setActionError("Please select a protein.");
      return;
    }

    setActionError(null);
    setIsAdding(true);

    try {
      const session = getCartSession();
      const result = await dispatch(
        addToCart({
          sessionId: session.sessionId,
          menuItemId: String(item.id),
          selectedProtein:
            selectedProteinName || availableProteins[0]?.name || "Default",
          selectedSize: hasSizeVariants ? selectedSizeName : undefined,
          quantity: 1,
        }),
      );

      if (addToCart.fulfilled.match(result)) {
        onAddedToCart?.();
        return;
      }

      setActionError(
        (typeof result.payload === "string" && result.payload) ||
          "Could not add item to cart.",
      );
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not add item to cart.",
      );
    } finally {
      setIsAdding(false);
    }
  };

  const renderSizeCard = (size: SizeVariant) => {
    const active = selectedSizeName === size.name;
    const quote = quoteSizePrice(item, size, parseFloat(String(size.price || 0)));
    const onOffer = quote.originalPrice != null;

    return (
      <button
        key={size.name}
        type="button"
        className={`${styles.sizeCard} ${active ? styles.sizeCardActive : ""}`}
        onClick={() => selectSize(size.name)}
        aria-pressed={active}
      >
        <span
          className={`${styles.sizeRadio} ${active ? styles.sizeRadioActive : ""}`}
          aria-hidden
        />
        <span className={styles.sizeName}>{size.name}</span>
        <span className={styles.sizePriceRow}>
          {onOffer ? (
            <span className={styles.sizePriceOriginal}>
              {formatRupee(quote.originalPrice ?? 0)}
            </span>
          ) : null}
          <span className={onOffer ? styles.sizePriceOffer : styles.sizePrice}>
            {formatRupee(quote.price)}
          </span>
        </span>
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
        onClick={() => {
          setSelectedProteinName(protein.name);
          setActionError(null);
        }}
        aria-pressed={active}
      >
        {proteinImage ? (
          <Image
            src={proteinImage}
            alt=""
            width={22}
            height={22}
            className={styles.proteinChipIcon}
            style={{ pointerEvents: "none" }}
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
              onChange={(event) => {
                setSelectedProteinName(event.target.value);
                setActionError(null);
              }}
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
          <p className={styles.totalValue}>
            {pricing.original_price != null ? (
              <span className={styles.totalOriginal}>
                {formatRupee(pricing.original_price)}
              </span>
            ) : null}
            {formatRupee(pricing.price)}
          </p>
        </div>

        <button
          type="button"
          className={`${styles.addToCartButton} ${
            orderingPaused ? styles.addToCartButtonClosed : ""
          }`}
          onClick={() => void handleAddToCart()}
          disabled={orderingPaused || isAdding}
          aria-busy={isAdding}
        >
          {orderingPaused ? null : isAdding ? (
            <FaSpinner className={styles.spinner} aria-hidden />
          ) : (
            <FaShoppingCart aria-hidden />
          )}
          {orderingPaused
            ? "Ordering Closed"
            : isAdding
              ? "Adding..."
              : !simple && availableProteins.length > 0 && !selectedProteinName
                ? "Select protein"
                : "Add to Cart"}
        </button>
        {actionError ? (
          <p className={styles.addToCartError}>{actionError}</p>
        ) : null}
      </div>
    </section>
  );
}
