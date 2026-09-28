"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { FaHeart, FaLeaf, FaShoppingCart, FaSpinner, FaTimes, FaUtensils } from "react-icons/fa";
import { GiMuscleUp } from "react-icons/gi";
import { addToCart } from "@lib/features/cartSlice";
import { getCartSession } from "@lib/cartSession";
import {
  encodeSaladProteinSelection,
  getSaladToppingOptions,
  getSaladTypeOptions,
} from "@lib/fitarritoHouseMenu";
import { calculateMenuItemPricing } from "@lib/menuPricing";
import { resolveMenuItemImageUrl, resolveProteinImageUrl } from "@lib/menuImages";
import { useAppDispatch } from "@lib/hooks";
import { useOrderWindow } from "@lib/useOrderWindow";
import type { menuItem, ProteinVariant, SizeVariant } from "@/types/types";
import styles from "./SaladCustomizeModal.module.css";

const FEATURES = [
  { icon: FaLeaf, label: "Fresh Ingredients", className: styles.featureGreen },
  { icon: GiMuscleUp, label: "High in Protein", className: styles.featureOrange },
  { icon: FaUtensils, label: "Customizable", className: styles.featureGreen },
  { icon: FaHeart, label: "Great Taste", className: styles.featureRed },
];

type SaladCustomizeModalProps = {
  item: menuItem;
  onClose: () => void;
  onAddedToCart?: () => void;
};

function formatRupee(amount: number) {
  return `₹${Math.round(amount)}`;
}

function getAvailableProteins(item: menuItem) {
  return (
    item.proteinVariants?.filter(
      (protein) => protein.name.toLowerCase() !== "mutton",
    ) ?? []
  );
}

export default function SaladCustomizeModal({
  item,
  onClose,
  onAddedToCart,
}: SaladCustomizeModalProps) {
  const dispatch = useAppDispatch();
  const orderWindow = useOrderWindow();
  const sizeVariants = item.sizeVariants ?? [];
  const availableProteins = getAvailableProteins(item);
  const saladTypeOptions = getSaladTypeOptions(item);
  const toppingOptions = getSaladToppingOptions(item);

  const [selectedSaladType, setSelectedSaladType] = useState(
    saladTypeOptions[0]?.name ?? "",
  );
  const [selectedSizeName, setSelectedSizeName] = useState(
    sizeVariants[0]?.name ?? "",
  );
  const [selectedToppings, setSelectedToppings] = useState<string[]>(() => {
    const roastedPeanuts = toppingOptions.find(
      (topping) => topping.name.toLowerCase() === "roasted peanuts",
    );

    return roastedPeanuts
      ? [roastedPeanuts.name]
      : toppingOptions[0]
        ? [toppingOptions[0].name]
        : [];
  });
  const [selectedProteinName, setSelectedProteinName] = useState(
    availableProteins[0]?.name ?? "",
  );
  const [isAdding, setIsAdding] = useState(false);
  const selectedSalad =
    saladTypeOptions.find((salad) => salad.name === selectedSaladType) ??
    saladTypeOptions[0];

  const totalPrice = useMemo(
    () =>
      calculateMenuItemPricing(
        item,
        selectedProteinName,
        selectedSizeName || null,
      ).price,
    [item, selectedProteinName, selectedSizeName],
  );

  const selectionLabel = [
    selectedSaladType,
    selectedSizeName ? `(${selectedSizeName})` : null,
    selectedToppings.length > 0 ? `+ ${selectedToppings.join(", ")}` : null,
    selectedProteinName && selectedProteinName !== "Veggies Only"
      ? `+ ${selectedProteinName}`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const toggleTopping = (toppingName: string) => {
    setSelectedToppings((current) =>
      current.includes(toppingName)
        ? current.filter((name) => name !== toppingName)
        : [...current, toppingName],
    );
  };

  const handleAddToCart = async () => {
    if (orderWindow === "closed" || isAdding) return;
    if (!selectedSaladType) return;
    if (sizeVariants.length > 0 && !selectedSizeName) return;
    if (availableProteins.length > 0 && !selectedProteinName) return;

    setIsAdding(true);

    try {
      const session = getCartSession();

      const result = await dispatch(
        addToCart({
          sessionId: session.sessionId,
          menuItemId: String(item.id),
          selectedProtein: encodeSaladProteinSelection({
            saladType: selectedSaladType,
            protein: selectedProteinName,
            toppings: selectedToppings,
          }),
          selectedSize: selectedSizeName || undefined,
          quantity: 1,
        }),
      );

      if (!addToCart.fulfilled.match(result)) {
        return;
      }

      onClose();
      onAddedToCart?.();
    } finally {
      setIsAdding(false);
    }
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
        <span className={styles.sizeHint}>
          {size.description ??
            (size.name.toLowerCase() === "mini"
              ? "A lighter portion"
              : "Bigger portion, more filling")}
        </span>
      </button>
    );
  };

  const renderProteinCard = (protein: ProteinVariant) => {
    const active = selectedProteinName === protein.name;
    const proteinImage = resolveProteinImageUrl(protein.imageUrl);

    return (
      <button
        key={protein.name}
        type="button"
        className={`${styles.choiceCard} ${active ? styles.choiceCardActive : ""}`}
        onClick={() => setSelectedProteinName(protein.name)}
        aria-pressed={active}
      >
        {proteinImage ? (
          <Image
            src={proteinImage}
            alt=""
            width={28}
            height={28}
            className={styles.proteinIcon}
            style={{ pointerEvents: "none" }}
          />
        ) : null}
        <span className={styles.choiceName}>{protein.name}</span>
      </button>
    );
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="salad-customize-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close salad customizer"
        >
          <FaTimes aria-hidden />
        </button>

        <div className={styles.mainRow}>
          <div className={styles.visualColumn}>
            <div className={styles.imageFrame}>
              <Image
                src={selectedSalad?.imageUrl ?? resolveMenuItemImageUrl(item)}
                alt={selectedSaladType || item.title}
                fill
                className={styles.heroImage}
                sizes="(max-width: 900px) 100vw, 420px"
                style={{
                  objectPosition: selectedSalad?.objectPosition ?? "center",
                }}
              />
            </div>

            <section className={styles.toppingsSection}>
              <h3 className={styles.sectionTitle}>
                3. Add Toppings{" "}
                <span className={styles.optional}>(Choose multiple)</span>
              </h3>
              <div className={styles.toppingGrid}>
                {toppingOptions.map((topping) => {
                  const active = selectedToppings.includes(topping.name);

                  return (
                    <button
                      key={topping.name}
                      type="button"
                      className={`${styles.toppingCard} ${
                        active ? styles.toppingCardActive : ""
                      }`}
                      onClick={() => toggleTopping(topping.name)}
                      aria-pressed={active}
                    >
                      <span
                        className={`${styles.checkbox} ${
                          active ? styles.checkboxActive : ""
                        }`}
                        aria-hidden
                      >
                        {active ? "✓" : ""}
                      </span>
                      <span className={styles.toppingEmoji} aria-hidden>
                        {topping.emoji}
                      </span>
                      <span className={styles.toppingName}>{topping.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <ul className={styles.featureList}>
              {FEATURES.map(({ icon: Icon, label, className }) => (
                <li key={label}>
                  <Icon className={className} aria-hidden />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.detailsColumn}>
          <header>
            <h2 id="salad-customize-title" className={styles.title}>
              {item.title}
            </h2>
            {item.description ? (
              <p className={styles.subtitle}>{item.description}</p>
            ) : null}
          </header>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>1. Choose Salad</h3>
            <div className={styles.saladGrid}>
              {saladTypeOptions.map((salad) => {
                const active = selectedSaladType === salad.name;

                return (
                  <button
                    key={salad.name}
                    type="button"
                    className={`${styles.saladCard} ${
                      active ? styles.saladCardActive : ""
                    }`}
                    onClick={() => setSelectedSaladType(salad.name)}
                    aria-pressed={active}
                  >
                    {active ? (
                      <span className={styles.selectedBadge} aria-hidden>
                        ✓
                      </span>
                    ) : null}
                    <span className={styles.saladImageWrap}>
                      <Image
                        src={salad.imageUrl}
                        alt=""
                        fill
                        className={styles.saladImage}
                        sizes="88px"
                        style={{ objectPosition: salad.objectPosition }}
                      />
                    </span>
                    <span className={styles.saladName}>{salad.name}</span>
                  </button>
                );
              })}
            </div>
            {selectedSalad?.description ? (
              <p className={styles.saladDescription}>{selectedSalad.description}</p>
            ) : null}
          </section>

          {sizeVariants.length > 0 ? (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>2. Choose Size</h3>
              <div className={styles.sizeGrid}>
                {sizeVariants.map(renderSizeCard)}
              </div>
            </section>
          ) : null}

          {availableProteins.length > 0 ? (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                4. Add Protein <span className={styles.optional}>(Optional)</span>
              </h3>
              <div className={styles.proteinGrid}>
                {availableProteins.map(renderProteinCard)}
              </div>
            </section>
          ) : null}

          <div className={styles.summaryBar}>
            <div>
              <p className={styles.summaryLabel}>Your Selection</p>
              <p className={styles.summaryValue}>{selectionLabel}</p>
            </div>
            <div className={styles.summaryPriceBlock}>
              <p className={styles.summaryLabel}>Total Price</p>
              <p className={styles.totalPrice}>{formatRupee(totalPrice)}</p>
            </div>
            <button
              type="button"
              className={`${styles.addButton} ${
                orderWindow === "closed" ? styles.addButtonClosed : ""
              }`}
              onClick={() => void handleAddToCart()}
              disabled={
                orderWindow === "closed" ||
                isAdding ||
                !selectedSaladType ||
                (sizeVariants.length > 0 && !selectedSizeName) ||
                (availableProteins.length > 0 && !selectedProteinName)
              }
              aria-busy={isAdding}
            >
              {orderWindow === "closed" ? null : isAdding ? (
                <FaSpinner className={styles.spinner} aria-hidden />
              ) : (
                <FaShoppingCart aria-hidden />
              )}
              {orderWindow === "closed"
                ? "Ordering Closed"
                : isAdding
                  ? "Adding..."
                  : "Add to Cart"}
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
