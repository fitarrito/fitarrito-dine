"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  FaChevronDown,
  FaHeart,
  FaLeaf,
  FaUtensils,
} from "react-icons/fa";
import { GiMuscleUp } from "react-icons/gi";
import { addToCart } from "@lib/features/cartSlice";
import { getCartSession } from "@lib/cartSession";
import { useAppDispatch } from "@lib/hooks";
import { useOrderWindow } from "@lib/useOrderWindow";
import {
  resolveMenuItemImageUrl,
  resolveProteinImageUrl,
} from "@lib/menuImages";
import { isFitarritoHouseSalad } from "@lib/fitarritoHouseMenu";
import type { menuItem, ProteinVariant, SizeVariant } from "@/types/types";
import SaladCustomizeModal from "./SaladCustomizeModal";
import styles from "./FitarritoHouseMenu.module.css";

function getAvailableProteins(item: menuItem) {
  return (
    item.proteinVariants?.filter(
      (protein) => protein.name.toLowerCase() !== "mutton",
    ) ?? []
  );
}

function FitarritoHouseCard({
  item,
  onAddedToCart,
  onCustomizeSalad,
}: {
  item: menuItem;
  onAddedToCart?: () => void;
  onCustomizeSalad?: (item: menuItem) => void;
}) {
  const dispatch = useAppDispatch();
  const orderWindow = useOrderWindow();
  const isSalad = isFitarritoHouseSalad(item);
  const sizeVariants = item.sizeVariants ?? [];
  const availableProteins = getAvailableProteins(item);

  const [selectedSizeName, setSelectedSizeName] = useState<string>(
    sizeVariants[0]?.name ?? "",
  );
  const [selectedProteinName, setSelectedProteinName] = useState<string>("");
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAddToCart = async () => {
    if (isSalad) {
      onCustomizeSalad?.(item);
      return;
    }

    if (orderWindow === "closed") return;

    if (sizeVariants.length > 0 && !selectedSizeName) {
      setActionError("Please select a size.");
      return;
    }
    if (availableProteins.length > 0 && !selectedProteinName) {
      setActionError("Please select a protein.");
      return;
    }

    setActionError(null);

    try {
      const session = getCartSession();
      const result = await dispatch(
        addToCart({
          sessionId: session.sessionId,
          menuItemId: String(item.id),
          selectedProtein: selectedProteinName,
          selectedSize: selectedSizeName || undefined,
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
    }
  };

  const renderSizeButton = (size: SizeVariant) => {
    const active = selectedSizeName === size.name;

    return (
      <button
        key={size.name}
        type="button"
        className={`${styles.optionButton} ${active ? styles.optionButtonActive : ""}`}
        onClick={() => setSelectedSizeName(size.name)}
        aria-pressed={active}
      >
        {size.name}
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
            width={24}
            height={24}
            className={styles.proteinIcon}
            style={{ pointerEvents: "none" }}
          />
        ) : null}
        <span className={styles.optionLabel}>{protein.name}</span>
      </button>
    );
  };

  return (
    <article className={styles.card}>
      <div className={styles.imageWrap}>
        <Image
          src={resolveMenuItemImageUrl(item)}
          alt={item.title}
          fill
          className={styles.cardImage}
        />
      </div>

      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{item.title}</h3>
        <p className={styles.cardDescription}>{item.description}</p>

        {!isSalad && sizeVariants.length > 0 ? (
          <div className={styles.optionSection}>
            <p className={styles.optionLabelTitle}>Choose Size</p>
            <div className={styles.optionRow}>{sizeVariants.map(renderSizeButton)}</div>
          </div>
        ) : null}

        {!isSalad && availableProteins.length > 0 ? (
          <div className={styles.optionSection}>
            <p className={styles.optionLabelTitle}>
              Choose Protein <span className={styles.required}>*</span>
            </p>
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
          </div>
        ) : null}

        <div className={styles.cardFooter}>
          <button
            type="button"
            className={`${styles.addButton} ${
              orderWindow === "closed" && !isSalad ? styles.addButtonClosed : ""
            }`}
            onClick={() => void handleAddToCart()}
            disabled={orderWindow === "closed" && !isSalad}
          >
            {orderWindow === "closed" && !isSalad
              ? "Ordering Closed"
              : !isSalad &&
                  availableProteins.length > 0 &&
                  !selectedProteinName
                ? "Select protein"
                : "Add to Cart"}
          </button>
          {actionError ? (
            <p className={styles.addError}>{actionError}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

type FitarritoHouseMenuProps = {
  items: menuItem[];
  onAddedToCart?: () => void;
};

export default function FitarritoHouseMenu({
  items,
  onAddedToCart,
}: FitarritoHouseMenuProps) {
  const displayItems = useMemo(
    () => items.filter((item) => (item.order_type ?? "on_demand") === "on_demand"),
    [items],
  );
  const [customizingSalad, setCustomizingSalad] = useState<menuItem | null>(null);

  return (
    <div className={styles.section}>
      <header className={styles.hero}>
        <div className={styles.heroBrand}>
          <Image
            src="/images/fitarrito.svg"
            alt=""
            width={36}
            height={36}
            className={styles.heroLogo}
          />
          <div>
            <h2 className={styles.heroTitle}>Fitarrito House</h2>
            <p className={styles.heroSubtitle}>
              Wholesome bowls, noodles and salads for a healthier you.
            </p>
          </div>
        </div>

        <ul className={styles.heroFeatures}>
          <li>
            <FaLeaf aria-hidden />
            Fresh Ingredients
          </li>
          <li>
            <GiMuscleUp aria-hidden />
            High Protein
          </li>
          <li>
            <FaUtensils aria-hidden />
            Customizable
          </li>
          <li>
            <FaHeart aria-hidden />
            Great Taste
          </li>
        </ul>
      </header>

      {displayItems.length > 0 ? (
        <div className={styles.grid}>
          {displayItems.map((item) => (
            <FitarritoHouseCard
              key={item.id}
              item={item}
              onAddedToCart={onAddedToCart}
              onCustomizeSalad={setCustomizingSalad}
            />
          ))}
        </div>
      ) : (
        <p className={styles.comingSoon}>No Fitarrito House items available.</p>
      )}

      <div className={styles.footerBar}>
        <FaLeaf className={styles.footerIcon} aria-hidden />
        <span>
          Freshly prepared | No artificial additives | Healthy &amp; delicious
        </span>
      </div>

      {customizingSalad ? (
        <SaladCustomizeModal
          item={customizingSalad}
          onClose={() => setCustomizingSalad(null)}
          onAddedToCart={onAddedToCart}
        />
      ) : null}
    </div>
  );
}
