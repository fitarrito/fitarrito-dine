"use client";

import { useMemo, useState } from "react";
import { FaLeaf, FaMinus, FaPlus, FaShoppingCart, FaSpinner } from "react-icons/fa";
import { GiChickenLeg, GiShrimp } from "react-icons/gi";
import { addToCart } from "@lib/features/cartSlice";
import { getCartSession } from "@lib/cartSession";
import { useAppDispatch } from "@lib/hooks";
import { resolveMenuItemImageUrl } from "@lib/menuImages";
import { encodeSoupSelection, sortSoupsAndBowls } from "@lib/soups";
import {
  encodeSoupsBowlsSelection,
  soupsBowlsPricesFor,
  type SoupsBowlsPriceOption,
  type SoupsBowlsStoredProtein,
} from "@lib/soupsBowlsOrder";
import { PanAsianMenuCard } from "./PanAsianMenu";
import VariantMenuCard from "./VariantMenuCard";
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

function BowlMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 10h14c-.4 4.2-2.4 6.8-7 6.8S5.4 14.2 5 10z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M8 17.2h8M9 8.2c.4-1.2 1-2 1.4-2.3M12.2 7.6c.3-1.2.8-1.9 1.2-2.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DishPhoto({ item }: { item: menuItem }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = resolveMenuItemImageUrl(item);
  const showImage = Boolean(item.imageUrl || imageUrl !== "/fallback-image.jpg") && !failed;

  return (
    <div className={styles.photo}>
      {showImage ? (
        <img src={imageUrl} alt={item.title} onError={() => setFailed(true)} />
      ) : (
        <span className={styles.photoFallback} aria-hidden="true">
          <SoupMark />
        </span>
      )}
    </div>
  );
}

function priceFor(
  rows: SoupsBowlsPriceOption[],
  serving: "Soup" | "Bowl",
  protein: SoupsBowlsStoredProtein,
) {
  const row = rows.find((option) => option.serving_type === serving && option.protein === protein);

  return row ? Number(row.price) : null;
}

function SoupsBowlsCard({
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
  const rows = useMemo(
    () => soupsBowlsPricesFor(item.title, item.soupsBowlsPrices),
    [item.soupsBowlsPrices, item.title],
  );
  const proteinChoices = (
    serving: "Soup" | "Bowl",
  ) =>
    (
      [
        ["Veg", "Veg"],
        ["Chicken", "Chicken"],
        ["Prawn", "Seafood"],
      ] as const
    ).flatMap(([storedProtein, label]) => {
      const price = priceFor(rows, serving, storedProtein);

      return price == null ? [] : [{ protein: storedProtein, label, price }];
    });
  const soupChoices = proteinChoices("Soup");
  const bowlChoices = proteinChoices("Bowl");
  const soupButtonPrice =
    soupChoices.length > 0 && soupChoices.every((choice) => choice.price === soupChoices[0]?.price)
      ? soupChoices[0]?.price ?? null
      : null;
  const [serving, setServing] = useState<"Soup" | "Bowl">("Soup");
  const [protein, setProtein] = useState<Exclude<SoupsBowlsStoredProtein, "None"> | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const choices = serving === "Soup" ? soupChoices : bowlChoices;

  const unitPrice = protein ? priceFor(rows, serving, protein) : null;
  const linePrice = unitPrice == null ? null : unitPrice * quantity;
  const canAdd = !orderingPaused && protein != null && linePrice != null && linePrice > 0;

  const chooseServing = (next: "Soup" | "Bowl") => {
    if (next === serving) return;

    setServing(next);
    setProtein(null);
    setActionError(null);
  };

  const handleAddToCart = async () => {
    if (orderingPaused || isAdding) return;

    if (!protein) {
      setActionError("Choose Veg, Chicken, or Seafood.");
      return;
    }

    if (unitPrice == null) {
      setActionError("This option is not available.");
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
          selectedProtein: encodeSoupsBowlsSelection({
            serving,
            protein,
            ingredient: null,
          }),
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
    <article className={styles.optionCard}>
      <DishPhoto item={item} />
      <div className={styles.optionBody}>
        <p className={styles.kicker}>
          <SoupMark />
          {categoryName}
        </p>
        <h3 className={styles.title}>{item.title}</h3>
        {item.description ? <p className={styles.description}>{item.description}</p> : null}

        <div className={styles.serving} role="group" aria-label={`${item.title} serving`}>
          {soupChoices.length > 0 ? (
            <button
              type="button"
              className={serving === "Soup" ? styles.servingActive : styles.servingIdle}
              aria-pressed={serving === "Soup"}
              onClick={() => chooseServing("Soup")}
            >
              <SoupMark />
              Soup
              {soupButtonPrice != null ? <strong>{formatRupee(soupButtonPrice)}</strong> : null}
            </button>
          ) : null}
          {bowlChoices.length > 0 ? (
            <button
              type="button"
              className={serving === "Bowl" ? styles.servingActive : styles.servingIdle}
              aria-pressed={serving === "Bowl"}
              onClick={() => chooseServing("Bowl")}
            >
              <BowlMark />
              Bowl
            </button>
          ) : null}
        </div>

        {choices.length > 0 ? (
          <div className={styles.proteins} role="group" aria-label={`${item.title} protein`}>
            {choices.map((choice) => {
              const active = protein === choice.protein;
              const iconClass =
                choice.protein === "Chicken"
                  ? styles.proteinIconChicken
                  : choice.protein === "Prawn"
                    ? styles.proteinIconSeafood
                    : styles.proteinIconVeg;

              return (
                <button
                  key={choice.protein}
                  type="button"
                  className={active ? styles.proteinActive : styles.protein}
                  aria-pressed={active}
                  onClick={() => {
                    setProtein(choice.protein);
                    setActionError(null);
                  }}
                >
                  <span className={`${styles.proteinIcon} ${iconClass}`} aria-hidden="true">
                    {choice.protein === "Chicken" ? (
                      <GiChickenLeg />
                    ) : choice.protein === "Prawn" ? (
                      <GiShrimp />
                    ) : (
                      <FaLeaf />
                    )}
                  </span>
                  <span>{choice.label}</span>
                  <strong>{formatRupee(choice.price)}</strong>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className={styles.footer}>
          <p className={styles.price}>{linePrice == null ? "—" : formatRupee(linePrice)}</p>
          <div className={styles.actions}>
            <div className={styles.quantity}>
              <button
                type="button"
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                aria-label={`Decrease ${item.title} quantity`}
              >
                <FaMinus aria-hidden />
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((current) => current + 1)}
                aria-label={`Increase ${item.title} quantity`}
              >
                <FaPlus aria-hidden />
              </button>
            </div>
            <button
              type="button"
              className={`${styles.addButton} ${!canAdd ? styles.addButtonClosed : ""}`}
              onClick={() => void handleAddToCart()}
              disabled={orderingPaused || isAdding || !canAdd}
              aria-busy={isAdding}
            >
              {isAdding ? <FaSpinner className={styles.spinner} aria-hidden /> : <FaShoppingCart aria-hidden />}
              {orderingPaused ? "Ordering Closed" : isAdding ? "Adding..." : "Add to Cart"}
            </button>
          </div>
        </div>
        {actionError ? <p className={styles.actionError}>{actionError}</p> : null}
      </div>
    </article>
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
        {hasImage ? <img src={imageUrl} alt={item.title} className={styles.cardImage} /> : null}
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
            <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} aria-label="Decrease quantity">
              <FaMinus aria-hidden />
            </button>
            <span>{quantity}</span>
            <button type="button" onClick={() => setQuantity((current) => current + 1)} aria-label="Increase quantity">
              <FaPlus aria-hidden />
            </button>
          </div>
          <button
            type="button"
            className={`${styles.addButton} ${orderingPaused ? styles.addButtonClosed : ""}`}
            onClick={() => void handleAddToCart()}
            disabled={orderingPaused || isAdding || !Number.isFinite(price) || price <= 0}
          >
            {isAdding ? <FaSpinner className={styles.spinner} aria-hidden /> : <FaShoppingCart aria-hidden />}
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
      sortSoupsAndBowls(
        items.filter((item) => (item.order_type ?? "on_demand") === "on_demand"),
      ),
    [items],
  );

  return (
    <section className={styles.section} aria-label={categoryName}>
      <header className={styles.heading}>
        <h2>{categoryName}</h2>
        <p>A comforting range of Asian soups and rice/noodle bowls.</p>
      </header>
      {soups.length > 0 ? (
        <div className={styles.list}>
          {soups.map((item) => {
            if (soupsBowlsPricesFor(item.title, item.soupsBowlsPrices).length > 0) {
              return (
                <SoupsBowlsCard
                  key={item.id}
                  item={item}
                  categoryName={categoryName}
                  onAddedToCart={onAddedToCart}
                />
              );
            }

            const hasBowlOptions = (item.panAsianPrices ?? []).some(
              (option) => option.is_available && Number(option.price) > 0,
            );

            if (hasBowlOptions) {
              return (
                <PanAsianMenuCard
                  key={item.id}
                  item={item}
                  kicker={categoryName}
                  onAddedToCart={onAddedToCart}
                />
              );
            }

            if ((item.proteinVariants?.length ?? 0) > 0) {
              return (
                <VariantMenuCard
                  key={item.id}
                  item={item}
                  kicker={categoryName}
                  icon={<SoupMark />}
                  mode="protein"
                  onAddedToCart={onAddedToCart}
                />
              );
            }

            return (
              <SoupCard
                key={item.id}
                item={item}
                categoryName={categoryName}
                onAddedToCart={onAddedToCart}
              />
            );
          })}
        </div>
      ) : (
        <p className={styles.empty}>{categoryName} are not available right now.</p>
      )}
    </section>
  );
}
