"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { FaMinus, FaPlus, FaShoppingCart, FaSpinner } from "react-icons/fa";
import { addToCart } from "@lib/features/cartSlice";
import { getCartSession } from "@lib/cartSession";
import { useAppDispatch } from "@lib/hooks";
import { resolveMenuItemImageUrl } from "@lib/menuImages";
import { encodeSoupSelection } from "@lib/soups";
import { orderingActionsPaused, useOnlineOrdering } from "@lib/useOnlineOrdering";
import type { menuItem } from "@/types/types";
import styles from "./SoupsMenu.module.css";

function formatRupee(amount: number) {
  return `₹${Math.round(amount)}`;
}

function SoupMark() {
  return (
    <svg className={styles.kickerIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8 9.2c.2-1.6 1.1-2.8 1.6-3.4.2 1.3-.1 2.4-.6 3.2M12 8.4c.3-1.7 1.3-3 1.8-3.6.2 1.4-.2 2.6-.8 3.4M16 9.2c.2-1.4.9-2.4 1.3-2.9.1 1.1-.2 2.1-.6 2.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M6.2 11.2h11.6c.2 3.4-1.5 6.3-5.8 6.3s-6-2.9-5.8-6.3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9 17.6h6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SoupCard({
  item,
  categoryName,
  onAddedToCart,
}: {
  item: menuItem;
  categoryName: string;
  onAddedToCart?: () => void;
}) {
  const dispatch = useAppDispatch();
  const ordering = useOnlineOrdering();
  const orderingPaused = orderingActionsPaused(ordering.enabled);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const price = Number(item.price);
  const imageUrl = resolveMenuItemImageUrl(item);
  const hasImage = Boolean(item.imageUrl) || imageUrl !== "/fallback-image.jpg";

  const handleAddToCart = async () => {
    if (orderingPaused || isAdding || !Number.isFinite(price) || price <= 0) return;

    setIsAdding(true);
    setActionError(null);

    try {
      const session = getCartSession();
      const result = await dispatch(
        addToCart({
          sessionId: session.sessionId,
          menuItemId: String(item.id),
          selectedProtein: encodeSoupSelection(),
          quantity,
        }),
      );

      if (addToCart.fulfilled.match(result)) {
        onAddedToCart?.();
        return;
      }

      setActionError(
        typeof result.payload === "string" ? result.payload : "Unable to add this soup.",
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
        <span className={`${styles.stroke} ${styles.strokeTop}`} aria-hidden="true" />
        <span className={`${styles.stroke} ${styles.strokeBottom}`} aria-hidden="true" />
      </div>
      <div className={styles.body}>
        <p className={styles.kicker}>
          <SoupMark />
          {categoryName}
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
            disabled={orderingPaused || isAdding || !Number.isFinite(price) || price <= 0}
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

type SoupsMenuProps = {
  items: menuItem[];
  categoryName: string;
  onAddedToCart?: () => void;
};

export default function SoupsMenu({ items, categoryName, onAddedToCart }: SoupsMenuProps) {
  const soups = useMemo(
    () =>
      items
        .filter((item) => (item.order_type ?? "on_demand") === "on_demand")
        .slice()
        .sort((left, right) => Number(left.id) - Number(right.id)),
    [items],
  );

  return (
    <section className={styles.section} aria-label={categoryName}>
      <header className={styles.heading}>
        <h2>{categoryName}</h2>
      </header>
      {soups.length > 0 ? (
        <div className={styles.list}>
          {soups.map((item) => (
            <SoupCard
              key={item.id}
              item={item}
              categoryName={categoryName}
              onAddedToCart={onAddedToCart}
            />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>{categoryName} are not available right now.</p>
      )}
    </section>
  );
}
