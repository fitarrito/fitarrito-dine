"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { FaLeaf } from "react-icons/fa";
import { addToCart } from "@lib/features/cartSlice";
import { getCartSession } from "@lib/cartSession";
import { useAppDispatch } from "@lib/hooks";
import { useOrderWindow } from "@lib/useOrderWindow";
import { resolveMenuItemImageUrl, resolveProteinImageUrl } from "@lib/menuImages";
import type { menuItem, ProteinVariant } from "@/types/types";
import styles from "./PanAsianMenu.module.css";

export type PanAsianSubCategory = "on-demand-bowls" | "starters";

export const PAN_ASIAN_SUB_CATEGORIES: {
  id: PanAsianSubCategory;
  label: string;
}[] = [
  { id: "on-demand-bowls", label: "On-Demand Bowls" },
  { id: "starters", label: "Starters" },
];

function getAvailableProteins(item: menuItem) {
  return (
    item.proteinVariants?.filter(
      (protein) => protein.name.toLowerCase() !== "mutton",
    ) ?? []
  );
}

function formatRupee(amount: number) {
  return `₹${Math.round(amount)}`;
}

function PanAsianMenuCard({
  item,
  onAddedToCart,
}: {
  item: menuItem;
  onAddedToCart?: () => void;
}) {
  const dispatch = useAppDispatch();
  const orderWindow = useOrderWindow();
  const availableProteins = getAvailableProteins(item);
  const [selectedProteinName, setSelectedProteinName] = useState<string>(
    availableProteins[0]?.name ?? "",
  );

  const totalPrice = useMemo(() => {
    const basePrice = parseFloat(String(item.price || 0));
    const protein = availableProteins.find(
      (option) => option.name === selectedProteinName,
    );

    return basePrice + parseFloat(String(protein?.price || 0));
  }, [availableProteins, item.price, selectedProteinName]);

  const handleAddToCart = async () => {
    if (orderWindow === "closed") return;

    const session = getCartSession();

    if (!selectedProteinName) return;

    const result = await dispatch(
      addToCart({
        sessionId: session.sessionId,
        menuItemId: String(item.id),
        selectedProtein: selectedProteinName,
        quantity: 1,
      }),
    );

    if (addToCart.fulfilled.match(result)) {
      onAddedToCart?.();
    }
  };

  const renderProteinButton = (protein: ProteinVariant) => {
    const active = selectedProteinName === protein.name;
    const addonPrice = parseFloat(String(protein.price || 0));
    const proteinImage = resolveProteinImageUrl(protein.imageUrl);

    return (
      <button
        key={protein.name}
        type="button"
        className={`${styles.proteinButton} ${active ? styles.proteinButtonActive : ""}`}
        onClick={() => setSelectedProteinName(protein.name)}
        aria-pressed={active}
      >
        {proteinImage ? (
          <Image
            src={proteinImage}
            alt=""
            width={18}
            height={18}
            className={styles.proteinIcon}
            style={{ pointerEvents: "none" }}
          />
        ) : null}
        <span className={styles.proteinLabelText}>
          {protein.name}{" "}
          <span className={styles.proteinAddon}>+ {formatRupee(addonPrice)}</span>
        </span>
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

        {availableProteins.length > 0 ? (
          <div className={styles.proteinSection}>
            <p className={styles.proteinLabel}>Choose Protein</p>
            <div className={styles.proteinOptions}>
              {availableProteins.map(renderProteinButton)}
            </div>
          </div>
        ) : null}

        <div className={styles.cardFooter}>
          <p className={styles.price}>₹ {totalPrice}</p>
          <button
            type="button"
            className={`${styles.addButton} ${
              orderWindow === "closed" ? styles.addButtonClosed : ""
            }`}
            onClick={() => void handleAddToCart()}
            disabled={orderWindow === "closed"}
          >
            {orderWindow === "closed" ? "Ordering Closed" : "Add to Cart"}
          </button>
        </div>
      </div>
    </article>
  );
}

type PanAsianMenuProps = {
  items: menuItem[];
  onAddedToCart?: () => void;
};

export default function PanAsianMenu({ items, onAddedToCart }: PanAsianMenuProps) {
  const [activeSubCategory, setActiveSubCategory] =
    useState<PanAsianSubCategory>("on-demand-bowls");

  const onDemandItems = useMemo(
    () =>
      items.filter(
        (item) => (item.order_type ?? "on_demand") === "on_demand",
      ),
    [items],
  );

  return (
    <div className={styles.section}>
      <div className={styles.subTabs}>
        {PAN_ASIAN_SUB_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`${styles.subTab} ${activeSubCategory === category.id ? styles.subTabActive : ""}`}
            onClick={() => setActiveSubCategory(category.id)}
            data-active={activeSubCategory === category.id}
          >
            {category.label}
          </button>
        ))}
      </div>

      {activeSubCategory === "on-demand-bowls" ? (
        onDemandItems.length > 0 ? (
          <div className={styles.grid}>
            {onDemandItems.map((item) => (
              <PanAsianMenuCard
                key={item.id}
                item={item}
                onAddedToCart={onAddedToCart}
              />
            ))}
          </div>
        ) : (
          <p className={styles.comingSoon}>No on-demand bowls available.</p>
        )
      ) : (
        <p className={styles.comingSoon}>
          {PAN_ASIAN_SUB_CATEGORIES.find((c) => c.id === activeSubCategory)?.label}{" "}
          coming soon.
        </p>
      )}

      <div className={styles.footerBar}>
        <FaLeaf className={styles.footerIcon} aria-hidden />
        <span>
          Freshly prepared | No artificial additives | Healthy &amp; delicious
        </span>
      </div>
    </div>
  );
}
