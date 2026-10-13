"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { FaMinus, FaPlus, FaShoppingCart, FaSpinner } from "react-icons/fa";
import { addToCart } from "@lib/features/cartSlice";
import { getCartSession } from "@lib/cartSession";
import { useAppDispatch } from "@lib/hooks";
import {
  DESSERT_PRICES,
  encodeDessertSelection,
  isDessertTitle,
  sortDessertDishes,
} from "@lib/desserts";
import { resolveMenuItemImageUrl } from "@lib/menuImages";
import { orderingActionsPaused, useOnlineOrdering } from "@lib/useOnlineOrdering";
import type { menuItem } from "@/types/types";
import styles from "./SoupsMenu.module.css";

function DessertMark() {
  return (
    <svg className={styles.kickerIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 14c0-3 2.2-5 5-5s5 2 5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M6 14.5h12c.2 2.6-1.4 4.5-6 4.5s-6.2-1.9-6-4.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatRupee(amount: number) {
  return `₹${Math.round(amount)}`;
}

function DessertCard({
  item,
  onAddedToCart,
}: {
  item: menuItem;
  onAddedToCart?: () => void;
}) {
  const dispatch = useAppDispatch();
  const ordering = useOnlineOrdering();
  const orderingPaused = orderingActionsPaused(ordering.enabled);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const price = isDessertTitle(item.title) ? DESSERT_PRICES[item.title] : 0;
  const imageUrl = resolveMenuItemImageUrl(item);
  const hasImage = imageUrl !== "/fallback-image.jpg";

  const handleAddToCart = async () => {
    if (orderingPaused || isAdding || price <= 0) return;

    setIsAdding(true);
    setActionError(null);

    try {
      const session = getCartSession();
      const result = await dispatch(
        addToCart({
          sessionId: session.sessionId,
          menuItemId: String(item.id),
          selectedProtein: encodeDessertSelection(),
          quantity,
        }),
      );

      if (addToCart.fulfilled.match(result)) {
        onAddedToCart?.();
        return;
      }

      setActionError(
        typeof result.payload === "string" ? result.payload : "Unable to add this dessert.",
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
          <DessertMark />
          Desserts
        </p>
        <h3 className={styles.title}>{item.title}</h3>
        {item.description ? <p className={styles.description}>{item.description}</p> : null}
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
            className={`${styles.addButton} ${orderingPaused ? styles.addButtonClosed : ""}`}
            onClick={() => void handleAddToCart()}
            disabled={orderingPaused || isAdding || price <= 0}
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

type DessertsMenuProps = {
  items: menuItem[];
  onAddedToCart?: () => void;
};

export default function DessertsMenu({ items, onAddedToCart }: DessertsMenuProps) {
  const desserts = useMemo(
    () =>
      sortDessertDishes(
        items.filter(
          (item) =>
            (item.order_type ?? "on_demand") === "on_demand" && isDessertTitle(item.title),
        ),
      ),
    [items],
  );

  return (
    <section className={styles.section}>
      <header className={styles.heading}>
        <h2>Desserts</h2>
        <p>Sweet mango, dates, and water chestnut.</p>
      </header>
      {desserts.length > 0 ? (
        <div className={styles.list}>
          {desserts.map((item) => (
            <DessertCard key={item.id} item={item} onAddedToCart={onAddedToCart} />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>Desserts are not available right now.</p>
      )}
    </section>
  );
}
