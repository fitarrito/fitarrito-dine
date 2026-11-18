"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { FaChevronDown, FaLeaf, FaMinus, FaPlus, FaShoppingCart, FaSpinner } from "react-icons/fa";
import { GiChickenLeg, GiShrimp } from "react-icons/gi";
import { addToCart } from "@lib/features/cartSlice";
import { getCartSession } from "@lib/cartSession";
import { useAppDispatch } from "@lib/hooks";
import { resolveMenuItemImageUrl } from "@lib/menuImages";
import { orderingActionsPaused, useOnlineOrdering } from "@lib/useOnlineOrdering";
import { isDessertsCategoryName } from "@lib/desserts";
import {
  encodePanAsianSelection,
  isPanAsianCategory,
  PAN_ASIAN_CATEGORIES,
  sortPanAsianDishes,
  sortPanAsianIngredients,
  type PanAsianCategory,
  type PanAsianIngredient,
} from "@lib/panAsianOrder";
import { isSoupsCategoryName } from "@lib/soups";
import type { menuItem } from "@/types/types";
import cardStyles from "./SoupsMenu.module.css";
import proteinStyles from "./AsianStartersGravyMenu.module.css";
import styles from "./PanAsianMenu.module.css";
import VariantMenuCard from "./VariantMenuCard";

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

function SectionMark() {
  return (
    <svg className={cardStyles.kickerIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 11h12M8 11c0 3.2 1.6 5.5 4 5.5s4-2.3 4-5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M9 8.5c.2-1.2.8-2 1.2-2.4M12 7.8c.2-1.3.9-2.1 1.3-2.5M15 8.5c.2-1 .6-1.6.9-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function categoryIcon(category: PanAsianCategory) {
  if (category === "Chicken") return <GiChickenLeg aria-hidden />;
  if (category === "Seafood") return <GiShrimp aria-hidden />;

  return <FaLeaf aria-hidden />;
}

export function PanAsianMenuCard({
  item,
  kicker = "Pan Asian",
  onAddedToCart,
}: {
  item: menuItem;
  kicker?: string;
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
  const needsProtein = !orderingPaused && !canAdd;

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
    <article className={`${cardStyles.card} ${styles.bowlCard}`}>
      <div className={`${cardStyles.imageWrap} ${styles.bowlImage}`}>
        <Image
          src={resolveMenuItemImageUrl(item)}
          alt={item.title}
          fill
          className={cardStyles.cardImage}
          sizes="(min-width: 768px) 11rem, 100vw"
        />
      </div>

      <div className={cardStyles.body}>
        <p className={cardStyles.kicker}>
          <SectionMark />
          {kicker}
        </p>
        <h3 className={cardStyles.title}>{item.title}</h3>
        {item.description ? <p className={cardStyles.description}>{item.description}</p> : null}

        <div className={proteinStyles.proteins}>
          {PAN_ASIAN_CATEGORIES.map((option) => {
            const price = prices.find((row) => row.category === option);

            if (!price) return null;

            const active = category === option;

            return (
              <button
                key={option}
                type="button"
                className={`${proteinStyles.protein} ${active ? proteinStyles.proteinActive : ""}`}
                onClick={() => {
                  setCategory(option);
                  setActionError(null);
                  if (option === "Veg") setIngredientsOpen(true);
                }}
                aria-pressed={active}
              >
                <span className={proteinStyles.proteinIcon}>{categoryIcon(option)}</span>
                <span>{option}</span>
                <strong>{formatRupee(price.price)}</strong>
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

        <p className={cardStyles.price}>{formatRupee(selectedPrice)}</p>
        <div className={cardStyles.actions}>
          <div className={cardStyles.quantity}>
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
            className={`${cardStyles.addButton} ${
              orderingPaused
                ? cardStyles.addButtonClosed
                : needsProtein
                  ? proteinStyles.addButtonInactive
                  : ""
            }`}
            onClick={() => void handleAddToCart()}
            disabled={orderingPaused || isAdding}
            aria-disabled={needsProtein || orderingPaused || isAdding}
            aria-busy={isAdding}
          >
            {isAdding ? (
              <FaSpinner className={cardStyles.spinner} aria-hidden />
            ) : (
              <FaShoppingCart aria-hidden />
            )}
            {orderingPaused ? "Ordering Closed" : isAdding ? "Adding..." : "Add to Cart"}
          </button>
        </div>
        {actionError ? <p className={cardStyles.actionError}>{actionError}</p> : null}
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

type FoodCategory = {
  id: number;
  name: string;
};

type PanAsianMenuProps = {
  items: menuItem[];
  categories?: FoodCategory[];
  onAddedToCart?: () => void;
};

export default function PanAsianMenu({
  items,
  categories = [],
  onAddedToCart,
}: PanAsianMenuProps) {
  const dishes = useMemo(() => {
    const categoryNameById = new Map(
      categories.map((category) => [Number(category.id), category.name]),
    );

    return sortPanAsianDishes(
      items.filter((item) => {
        if ((item.order_type ?? "on_demand") !== "on_demand") return false;
        if ((item.panAsianPrices?.length ?? 0) === 0) return false;

        return !isSoupsCategoryName(categoryNameById.get(Number(item.categoryId)));
      }),
    );
  }, [categories, items]);
  const extraGroups = useMemo(() => {
    const groups = new Map<string, { id: number; name: string; items: menuItem[] }>();

    for (const item of items) {
      if ((item.order_type ?? "on_demand") !== "on_demand") continue;
      if ((item.panAsianPrices?.length ?? 0) > 0) continue;
      if ((item.proteinVariants?.length ?? 0) === 0 && (item.sizeVariants?.length ?? 0) === 0) {
        continue;
      }

      const category = categories.find(
        (entry) => Number(entry.id) === Number(item.categoryId),
      );
      const name = category?.name ?? "";

      if (isSoupsCategoryName(name) || isDessertsCategoryName(name)) continue;

      const key = name || "Pan Asian";
      const group = groups.get(key) ?? {
        id: Number(category?.id ?? 0),
        name: key,
        items: [],
      };

      group.items.push(item);
      groups.set(key, group);
    }

    return [...groups.values()]
      .sort((left, right) => left.id - right.id)
      .map((group) => ({
        ...group,
        items: group.items.slice().sort((left, right) => left.title.localeCompare(right.title)),
      }));
  }, [categories, items]);

  return (
    <section className={cardStyles.section}>
      <header className={cardStyles.heading}>
        <h2>Pan Asian</h2>
        <p>Bold flavours from across Asia.</p>
      </header>

      {dishes.length > 0 ? (
        <div className={cardStyles.list}>
          {dishes.map((item) => (
            <PanAsianMenuCard key={item.id} item={item} onAddedToCart={onAddedToCart} />
          ))}
        </div>
      ) : null}
      {extraGroups.map((group) => (
        <div key={group.name}>
          <h3 className={proteinStyles.groupTitle}>{group.name}</h3>
          <div className={cardStyles.list}>
            {group.items.map((item) => (
              <VariantMenuCard
                key={item.id}
                item={item}
                kicker={group.name}
                mode="protein"
                onAddedToCart={onAddedToCart}
              />
            ))}
          </div>
        </div>
      ))}
      {dishes.length === 0 && extraGroups.length === 0 ? (
        <p className={cardStyles.empty}>Pan Asian bowls are not available right now.</p>
      ) : null}
    </section>
  );
}

