"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { FaMinus, FaPlus, FaShoppingCart, FaSpinner } from "react-icons/fa";
import { addToCart } from "@lib/features/cartSlice";
import { getCartSession } from "@lib/cartSession";
import { encodeDessertSelection } from "@lib/desserts";
import { useAppDispatch } from "@lib/hooks";
import { calculateMenuItemPricing, getAvailableProteinVariants } from "@lib/menuPricing";
import { resolveMenuItemImageUrl, resolveProteinImageUrl } from "@lib/menuImages";
import { quoteSizePrice } from "@lib/mexicanMiniOffer";
import { formatChoicePrompt, readFormatOptions } from "@lib/menuFormat";
import { FIXED_MENU_SELECTION } from "@lib/menuVisibility";
import { orderingActionsPaused, useOnlineOrdering } from "@lib/useOnlineOrdering";
import type { menuItem } from "@/types/types";
import styles from "./SoupsMenu.module.css";
import proteinStyles from "./AsianStartersGravyMenu.module.css";
import baseStyles from "./PanAsianMenu.module.css";

function formatRupee(amount: number) {
  return `₹${Math.round(amount)}`;
}

type VariantMenuCardProps = {
  item: menuItem;
  kicker: string;
  icon?: ReactNode;
  mode: "protein" | "fixed" | "dessert";
  onAddedToCart?: () => void;
};

export default function VariantMenuCard({
  item,
  kicker,
  icon,
  mode,
  onAddedToCart,
}: VariantMenuCardProps) {
  const dispatch = useAppDispatch();
  const ordering = useOnlineOrdering();
  const orderingPaused = orderingActionsPaused(ordering.enabled);
  const sizes = item.sizeVariants ?? [];
  const portionSizes = sizes.some((size) => /^(mini|regular)$/i.test(size.name.trim()));
  const [selectedSizeName, setSelectedSizeName] = useState(sizes[0]?.name ?? "");
  const proteins = useMemo(
    () => (mode === "protein" ? getAvailableProteinVariants(item, selectedSizeName) : []),
    [item, mode, selectedSizeName],
  );
  const formatOptions = useMemo(() => readFormatOptions(item.formatOptions), [item.formatOptions]);
  const requiresFormatChoice = formatOptions.length > 1;
  const [format, setFormat] = useState<string | null>(null);
  const [selectedProteinName, setSelectedProteinName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const imageUrl = resolveMenuItemImageUrl(item);
  const hasImage = Boolean(item.imageUrl) || imageUrl !== "/fallback-image.jpg";
  const selectedFormat = requiresFormatChoice
    ? formatOptions.find((option) => option.toLowerCase() === format?.toLowerCase()) ?? null
    : formatOptions[0] ?? null;
  const needsFormat = !orderingPaused && requiresFormatChoice && !selectedFormat;
  const needsProtein = mode === "protein" && proteins.length > 0 && !selectedProteinName;
  const pricing = calculateMenuItemPricing(
    item,
    mode === "protein" ? selectedProteinName : null,
    sizes.length > 0 ? selectedSizeName : null,
  );
  const dessertSize = sizes.find(
    (size) => size.name.toLowerCase() === selectedSizeName.trim().toLowerCase(),
  );
  const price =
    mode === "dessert"
      ? sizes.length > 0
        ? Math.round(Number(dessertSize?.price ?? 0))
        : Math.round(Number(item.price))
      : pricing.price;
  const canAdd = Number.isFinite(price) && price > 0 && !needsProtein;

  const handleAddToCart = async () => {
    if (orderingPaused || isAdding) return;

    if (sizes.length > 0 && !selectedSizeName) {
      setActionError(portionSizes ? "Please select a size." : "Please select an option.");
      return;
    }

    if (needsFormat) {
      setActionError(formatChoicePrompt(formatOptions));
      return;
    }

    if (needsProtein) {
      setActionError("Please select a protein.");
      return;
    }

    if (!canAdd) return;

    setIsAdding(true);
    setActionError(null);

    try {
      const session = getCartSession();
      const result = await dispatch(
        addToCart({
          sessionId: session.sessionId,
          menuItemId: String(item.id),
          selectedProtein:
            mode === "dessert"
              ? encodeDessertSelection()
              : mode === "fixed"
                ? FIXED_MENU_SELECTION
                : selectedProteinName,
          selectedSize: sizes.length > 0 ? selectedSizeName : undefined,
          itemFormat: selectedFormat,
          quantity,
        }),
      );

      if (addToCart.fulfilled.match(result)) {
        onAddedToCart?.();
        return;
      }

      setActionError(
        typeof result.payload === "string" ? result.payload : "Unable to add this dish.",
      );
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <article className={styles.card}>
      <div className={styles.imageWrap}>
        {hasImage ? (
          <Image
            src={imageUrl}
            alt={item.title}
            fill
            className={styles.cardImage}
            sizes="(min-width: 768px) 28rem, 100vw"
          />
        ) : null}
      </div>
      <div className={styles.body}>
        <p className={styles.kicker}>
          {icon}
          {kicker}
        </p>
        <h3 className={styles.title}>{item.title}</h3>
        {item.description ? <p className={styles.description}>{item.description}</p> : null}
        {requiresFormatChoice ? (
          <div className={baseStyles.baseChoice}>
            <p className={baseStyles.baseLabel}>Choose your base</p>
            <div className={baseStyles.baseOptions} role="group" aria-label="Choose your base">
              {formatOptions.map((option) => {
                const active = selectedFormat === option;

                return (
                  <button
                    key={option}
                    type="button"
                    className={`${baseStyles.baseOption} ${active ? baseStyles.baseOptionActive : ""}`}
                    onClick={() => {
                      setFormat(option);
                      setActionError(null);
                    }}
                    aria-pressed={active}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {sizes.length > 0 ? (
          <div className={proteinStyles.proteins} role="group" aria-label={portionSizes ? "Size" : "Option"}>
            {sizes.map((size) => {
              const active = selectedSizeName === size.name;
              const quoted = quoteSizePrice(item, size, Number(item.price)).price;

              return (
                <button
                  key={size.name}
                  type="button"
                  className={`${proteinStyles.protein} ${active ? proteinStyles.proteinActive : ""}`}
                  onClick={() => {
                    setSelectedSizeName(size.name);
                    if (
                      size.name.trim().toLowerCase() === "mini" &&
                      selectedProteinName.trim().toLowerCase() === "prawn"
                    ) {
                      setSelectedProteinName("");
                    }
                    setActionError(null);
                  }}
                  aria-pressed={active}
                >
                  <span>{size.name}</span>
                  <strong>{formatRupee(mode === "dessert" ? Number(size.price) : quoted)}</strong>
                </button>
              );
            })}
          </div>
        ) : null}
        {proteins.length > 0 ? (
          <div className={proteinStyles.proteins} role="group" aria-label="Protein">
            {proteins.map((protein) => {
              const active = selectedProteinName === protein.name;
              const proteinImage = resolveProteinImageUrl(protein.imageUrl);
              const addOn = Math.round(Number(protein.price) || 0);

              return (
                <button
                  key={protein.name}
                  type="button"
                  className={`${proteinStyles.protein} ${active ? proteinStyles.proteinActive : ""}`}
                  onClick={() => {
                    setSelectedProteinName(protein.name);
                    setActionError(null);
                  }}
                  aria-pressed={active}
                >
                  {proteinImage ? (
                    <Image src={proteinImage} alt="" width={18} height={18} />
                  ) : null}
                  <span>{protein.name}</span>
                  {addOn > 0 ? <strong>+{formatRupee(addOn)}</strong> : null}
                </button>
              );
            })}
          </div>
        ) : null}
        <p className={styles.price}>{formatRupee(price)}</p>
        <div className={styles.actions}>
          <div className={styles.quantity}>
            <button
              type="button"
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              aria-label="Decrease quantity"
            >
              <FaMinus aria-hidden />
            </button>
            <span>{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((current) => current + 1)}
              aria-label="Increase quantity"
            >
              <FaPlus aria-hidden />
            </button>
          </div>
          <button
            type="button"
            className={`${styles.addButton} ${
              orderingPaused
                ? styles.addButtonClosed
                : needsFormat || needsProtein
                  ? proteinStyles.addButtonInactive
                  : ""
            }`}
            onClick={() => void handleAddToCart()}
            disabled={orderingPaused || isAdding}
            aria-disabled={orderingPaused || isAdding || needsFormat || !canAdd}
            aria-busy={isAdding}
          >
            {isAdding ? (
              <FaSpinner className={styles.spinner} aria-hidden />
            ) : (
              <FaShoppingCart aria-hidden />
            )}
            {orderingPaused
              ? "Ordering Closed"
              : isAdding
                ? "Adding..."
                : needsFormat
                  ? "Choose your base"
                  : needsProtein
                    ? "Select protein"
                    : "Add to Cart"}
          </button>
        </div>
        {actionError ? <p className={styles.actionError}>{actionError}</p> : null}
      </div>
    </article>
  );
}
