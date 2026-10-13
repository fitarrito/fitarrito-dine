"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { FaLeaf, FaMinus, FaPlus, FaShoppingCart, FaSpinner } from "react-icons/fa";
import { GiChickenLeg, GiShrimp } from "react-icons/gi";
import { addToCart } from "@lib/features/cartSlice";
import { getCartSession } from "@lib/cartSession";
import { useAppDispatch } from "@lib/hooks";
import { resolveMenuItemImageUrl } from "@lib/menuImages";
import { orderingActionsPaused, useOnlineOrdering } from "@lib/useOnlineOrdering";
import {
  ASIAN_STARTERS_GRAVY_PROTEINS,
  availableAsianStartersGravyPrices,
  encodeAsianStartersGravySelection,
  isAsianStartersGravyProtein,
  sortAsianGravyDishes,
  sortAsianStarterDishes,
  type AsianStartersGravyProtein,
} from "@lib/asianStartersGravyOrder";
import type { menuItem } from "@/types/types";
import styles from "./SoupsMenu.module.css";
import localStyles from "./AsianStartersGravyMenu.module.css";

function formatRupee(amount: number) {
  return `₹${Math.round(amount)}`;
}

function SectionMark() {
  return (
    <svg className={styles.kickerIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 10.5h14M7 10.5c0 4 2 7 5 7s5-3 5-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M9 8.2c.3-1.4 1-2.2 1.4-2.6M12 7.4c.3-1.5 1.1-2.4 1.5-2.8M15 8.2c.2-1.2.8-2 1.1-2.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function proteinIcon(category: AsianStartersGravyProtein) {
  if (category === "Chicken") return <GiChickenLeg aria-hidden />;
  if (category === "Prawn") return <GiShrimp aria-hidden />;

  return <FaLeaf aria-hidden />;
}

function AsianStartersGravyCard({
  item,
  kind,
  onAddedToCart,
}: {
  item: menuItem;
  kind: "starter" | "gravy";
  onAddedToCart?: () => void;
}) {
  const dispatch = useAppDispatch();
  const ordering = useOnlineOrdering();
  const orderingPaused = orderingActionsPaused(ordering.enabled);
  const prices = useMemo(
    () => availableAsianStartersGravyPrices(item.asianStartersGravyPrices, item.title),
    [item.asianStartersGravyPrices, item.title],
  );
  const proteinPrices = ASIAN_STARTERS_GRAVY_PROTEINS.flatMap((category) => {
    const option = prices.find((row) => row.category === category);

    return option ? [option] : [];
  });
  const fixedPrice = prices.find((row) => row.category === "Fixed")?.price ?? 0;
  const initialProtein =
    proteinPrices.find((row) => row.category === "Veg")?.category ??
    proteinPrices.find((row) => isAsianStartersGravyProtein(row.category))?.category ??
    "Veg";
  const [category, setCategory] = useState<AsianStartersGravyProtein>(
    isAsianStartersGravyProtein(initialProtein) ? initialProtein : "Veg",
  );
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const imageUrl = resolveMenuItemImageUrl(item);
  const hasImage = imageUrl !== "/fallback-image.jpg";
  const selectedPrice =
    kind === "starter"
      ? fixedPrice
      : (proteinPrices.find((row) => row.category === category)?.price ?? 0);
  const canAdd = selectedPrice > 0;
  const needsProtein = kind === "gravy" && !orderingPaused && !canAdd;

  const handleAddToCart = async () => {
    if (orderingPaused || isAdding) return;

    if (!canAdd) {
      setActionError("Choose one protein.");
      return;
    }

    setIsAdding(true);
    setActionError(null);

    try {
      const session = getCartSession();
      const result = await dispatch(
        addToCart({
          sessionId: session.sessionId,
          menuItemId: String(item.id),
          selectedProtein: encodeAsianStartersGravySelection(
            kind === "starter" ? "Fixed" : category,
          ),
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
            sizes="(min-width: 768px) 11rem, 100vw"
          />
        ) : null}
        <span className={`${styles.stroke} ${styles.strokeTop}`} aria-hidden="true" />
        <span className={`${styles.stroke} ${styles.strokeBottom}`} aria-hidden="true" />
      </div>

      <div className={styles.body}>
        <p className={styles.kicker}>
          <SectionMark />
          {kind === "starter" ? "Asian Starters" : "Gravy"}
        </p>
        <h3 className={styles.title}>{item.title}</h3>
        {item.description ? <p className={styles.description}>{item.description}</p> : null}

        {kind === "gravy" ? (
          <div className={localStyles.proteins}>
            {proteinPrices.map((option) => {
              if (!isAsianStartersGravyProtein(option.category)) return null;

              const active = category === option.category;

              return (
                <button
                  key={option.category}
                  type="button"
                  className={`${localStyles.protein} ${active ? localStyles.proteinActive : ""}`}
                  onClick={() => {
                    setCategory(option.category as AsianStartersGravyProtein);
                    setActionError(null);
                  }}
                  aria-pressed={active}
                >
                  <span className={localStyles.proteinIcon}>{proteinIcon(option.category)}</span>
                  <span>{option.category}</span>
                  <strong>{formatRupee(option.price)}</strong>
                </button>
              );
            })}
          </div>
        ) : null}

        <p className={styles.price}>{formatRupee(selectedPrice)}</p>
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
              orderingPaused ? styles.addButtonClosed : needsProtein ? localStyles.addButtonInactive : ""
            }`}
            onClick={() => void handleAddToCart()}
            disabled={orderingPaused || isAdding}
            aria-disabled={needsProtein || orderingPaused || isAdding}
            aria-busy={isAdding}
          >
            {isAdding ? (
              <FaSpinner className={styles.spinner} aria-hidden />
            ) : (
              <FaShoppingCart aria-hidden />
            )}
            {orderingPaused ? "Ordering Closed" : isAdding ? "Adding..." : "Add to Cart"}
          </button>
        </div>
        {actionError ? <p className={styles.actionError}>{actionError}</p> : null}
      </div>
    </article>
  );
}

type AsianStartersGravyMenuProps = {
  items: menuItem[];
  onAddedToCart?: () => void;
};

export default function AsianStartersGravyMenu({
  items,
  onAddedToCart,
}: AsianStartersGravyMenuProps) {
  const onDemandItems = useMemo(
    () => items.filter((item) => (item.order_type ?? "on_demand") === "on_demand"),
    [items],
  );
  const starters = useMemo(
    () =>
      sortAsianStarterDishes(
        onDemandItems.filter((item) =>
          availableAsianStartersGravyPrices(item.asianStartersGravyPrices, item.title).some(
            (option) => option.category === "Fixed",
          ),
        ),
      ),
    [onDemandItems],
  );
  const gravies = useMemo(
    () =>
      sortAsianGravyDishes(
        onDemandItems.filter((item) => {
          const prices = availableAsianStartersGravyPrices(
            item.asianStartersGravyPrices,
            item.title,
          );

          return (
            prices.some((option) => isAsianStartersGravyProtein(option.category)) &&
            !prices.some((option) => option.category === "Fixed")
          );
        }),
      ),
    [onDemandItems],
  );

  return (
    <section className={styles.section}>
      <header className={styles.heading}>
        <h2>Asian Starters & Gravy</h2>
        <p>Crisp starters and gravies from across Asia.</p>
      </header>

      {starters.length > 0 ? (
        <>
          <h3 className={localStyles.groupTitle}>Asian Starters</h3>
          <div className={styles.list}>
            {starters.map((item) => (
              <AsianStartersGravyCard
                key={item.id}
                item={item}
                kind="starter"
                onAddedToCart={onAddedToCart}
              />
            ))}
          </div>
        </>
      ) : null}

      {gravies.length > 0 ? (
        <>
          <h3 className={localStyles.groupTitle}>Gravy</h3>
          <div className={styles.list}>
            {gravies.map((item) => (
              <AsianStartersGravyCard
                key={item.id}
                item={item}
                kind="gravy"
                onAddedToCart={onAddedToCart}
              />
            ))}
          </div>
        </>
      ) : null}

      {starters.length === 0 && gravies.length === 0 ? (
        <p className={styles.empty}>Asian starters and gravies are not available right now.</p>
      ) : null}
    </section>
  );
}
