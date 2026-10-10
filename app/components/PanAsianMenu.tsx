"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { FaChevronDown, FaLeaf, FaMinus, FaPlus, FaSpinner } from "react-icons/fa";
import { GiChickenLeg, GiShrimp } from "react-icons/gi";
import { addToCart } from "@lib/features/cartSlice";
import { getCartSession } from "@lib/cartSession";
import { useAppDispatch } from "@lib/hooks";
import { resolveMenuItemImageUrl } from "@lib/menuImages";
import { orderingActionsPaused, useOnlineOrdering } from "@lib/useOnlineOrdering";
import {
  encodePanAsianSelection,
  isPanAsianCategory,
  PAN_ASIAN_CATEGORIES,
  sortPanAsianDishes,
  sortPanAsianIngredients,
  type PanAsianCategory,
  type PanAsianIngredient,
} from "@lib/panAsianOrder";
import type { menuItem } from "@/types/types";
import styles from "./PanAsianMenu.module.css";

const INGREDIENT_ICONS: Record<string, string> = {
  Mushroom: "/images/menuimages/proteinImages/MushroomIcon.svg",
  Broccoli: "/images/menuimages/proteinImages/Brocolli.svg",
  Paneer: "/images/menuimages/proteinImages/PaneerIcon.svg",
  Tofu: "/images/menuimages/proteinImages/TofuIcon.png",
  Chicken: "/images/menuimages/proteinImages/ChickenIcon.svg",
  Prawn: "/images/menuimages/proteinImages/PrawnIcon.png",
};

function formatRupee(amount: number) {
  return `₹${Math.round(amount)}`;
}

function categoryIcon(category: PanAsianCategory) {
  if (category === "Chicken") return <GiChickenLeg aria-hidden />;
  if (category === "Seafood") return <GiShrimp aria-hidden />;

  return <FaLeaf aria-hidden />;
}

function PanAsianMenuCard({
  item,
  onAddedToCart,
}: {
  item: menuItem;
  onAddedToCart?: () => void;
}) {
  const dispatch = useAppDispatch();
  const ordering = useOnlineOrdering();
  const orderingPaused = orderingActionsPaused(ordering.enabled);
  const prices = useMemo(
    () =>
      (item.panAsianPrices ?? [])
        .filter((option) => option.is_available && isPanAsianCategory(option.category))
        .sort((left, right) => left.sort_order - right.sort_order),
    [item.panAsianPrices],
  );
  const ingredients = useMemo(
    () => sortPanAsianIngredients((item.panAsianIngredients ?? []).filter((row) => row.is_available)),
    [item.panAsianIngredients],
  );
  const [category, setCategory] = useState<PanAsianCategory>("Veg");
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
  const [ingredientsOpen, setIngredientsOpen] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const categoryIngredients = ingredients.filter((row) => row.category === category);
  const selectedPrice = prices.find((option) => option.category === category)?.price ?? 0;
  const chosenIngredients =
    category === "Veg"
      ? selectedIngredient &&
        categoryIngredients.some((row) => row.ingredient_name === selectedIngredient)
        ? [selectedIngredient]
        : []
      : categoryIngredients.map((row) => row.ingredient_name);
  const canAdd = chosenIngredients.length > 0 && selectedPrice > 0;

  const handleAddToCart = async () => {
    if (orderingPaused || isAdding || !canAdd) return;

    setIsAdding(true);
    setActionError(null);

    try {
      const session = getCartSession();
      const result = await dispatch(
        addToCart({
          sessionId: session.sessionId,
          menuItemId: String(item.id),
          selectedProtein: encodePanAsianSelection(category, chosenIngredients),
          quantity,
        }),
      );

      if (addToCart.fulfilled.match(result)) {
        onAddedToCart?.();
        return;
      }

      setActionError(
        typeof result.payload === "string" ? result.payload : "Unable to add this bowl.",
      );
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <article className={styles.card}>
      <div className={styles.imageWrap}>
        <Image
          src={resolveMenuItemImageUrl(item)}
          alt={item.title}
          fill
          className={styles.cardImage}
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
        />
      </div>

      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{item.title}</h3>
        <p className={styles.cardDescription}>{item.description}</p>

        <div className={styles.categoryRow}>
          {PAN_ASIAN_CATEGORIES.map((option) => {
            const price = prices.find((row) => row.category === option);

            if (!price) return null;

            const active = category === option;

            return (
              <button
                key={option}
                type="button"
                className={`${styles.categoryButton} ${active ? styles.categoryButtonActive : ""}`}
                onClick={() => {
                  setCategory(option);
                  setActionError(null);
                  if (option === "Veg") setIngredientsOpen(true);
                }}
                aria-pressed={active}
              >
                <span className={styles.categoryIcon}>{categoryIcon(option)}</span>
                <span>
                  {option}
                  <strong>{formatRupee(price.price)}</strong>
                </span>
              </button>
            );
          })}
        </div>

        {category === "Veg" ? (
          <div className={styles.ingredientPanel}>
            <button
              type="button"
              className={styles.ingredientToggle}
              onClick={() => setIngredientsOpen((open) => !open)}
              aria-expanded={ingredientsOpen}
            >
              <span>
                {chosenIngredients[0] ?? "Select ingredient"}
                <small> (select one)</small>
              </span>
              <FaChevronDown
                className={ingredientsOpen ? styles.chevronOpen : styles.chevron}
                aria-hidden
              />
            </button>
            {ingredientsOpen ? (
              <div className={styles.ingredientGrid}>
                {categoryIngredients.map((ingredient) => (
                  <IngredientChoice
                    key={ingredient.id}
                    ingredient={ingredient}
                    groupName={`pan-asian-${item.id}-veg`}
                    checked={selectedIngredient === ingredient.ingredient_name}
                    onSelect={() => {
                      setSelectedIngredient(ingredient.ingredient_name);
                      setActionError(null);
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={styles.cardFooter}>
          <p className={styles.price}>{formatRupee(selectedPrice)}</p>
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
            disabled={orderingPaused || isAdding || !canAdd}
            aria-busy={isAdding}
          >
            {isAdding ? <FaSpinner className={styles.spinner} aria-hidden /> : null}
            {orderingPaused ? "Ordering Closed" : isAdding ? "Adding..." : "Add to Cart"}
          </button>
        </div>
        {actionError ? <p className={styles.actionError}>{actionError}</p> : null}
      </div>
    </article>
  );
}

function IngredientChoice({
  ingredient,
  checked,
  groupName,
  onSelect,
}: {
  ingredient: PanAsianIngredient;
  checked: boolean;
  groupName: string;
  onSelect: () => void;
}) {
  const icon = INGREDIENT_ICONS[ingredient.ingredient_name];

  return (
    <label className={styles.ingredientChoice}>
      <input
        type="radio"
        name={groupName}
        checked={checked}
        onChange={onSelect}
      />
      <span className={styles.radio} aria-hidden />
      {icon ? (
        <Image src={icon} alt="" width={22} height={22} className={styles.ingredientIcon} />
      ) : null}
      <span>{ingredient.ingredient_name}</span>
    </label>
  );
}

type PanAsianMenuProps = {
  items: menuItem[];
  onAddedToCart?: () => void;
};

export default function PanAsianMenu({ items, onAddedToCart }: PanAsianMenuProps) {
  const dishes = useMemo(
    () =>
      sortPanAsianDishes(
        items.filter(
          (item) =>
            (item.order_type ?? "on_demand") === "on_demand" &&
            (item.panAsianPrices?.length ?? 0) > 0,
        ),
      ),
    [items],
  );

  return (
    <section className={styles.section}>
      <header className={styles.heading}>
        <h2>Pan Asian</h2>
        <p>Bold flavours from across Asia.</p>
      </header>

      {dishes.length > 0 ? (
        <div className={styles.grid}>
          {dishes.map((item) => (
            <PanAsianMenuCard key={item.id} item={item} onAddedToCart={onAddedToCart} />
          ))}
        </div>
      ) : (
        <p className={styles.comingSoon}>Pan Asian bowls are not available right now.</p>
      )}
    </section>
  );
}

