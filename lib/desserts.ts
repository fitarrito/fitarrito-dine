import type { SizeVariant } from "@/types/types";

const DESSERT_ORDER = ["Mango Sticky Rice", "Wanton Dates", "Water Chestnut"];

const DESSERT_SELECTION = "Desserts: Fixed";

export function isDessertsCategoryName(name?: string | null) {
  return name?.trim().toLowerCase() === "desserts";
}

export function encodeDessertSelection() {
  return DESSERT_SELECTION;
}

export function decodeDessertSelection(value?: string | null) {
  return value?.trim() === DESSERT_SELECTION ? { fixed: true as const } : null;
}

export function sortDessertDishes<T extends { title: string }>(items: T[]) {
  return items.slice().sort((left, right) => {
    const leftIndex = DESSERT_ORDER.indexOf(left.title);
    const rightIndex = DESSERT_ORDER.indexOf(right.title);
    const leftOrder = leftIndex === -1 ? DESSERT_ORDER.length : leftIndex;
    const rightOrder = rightIndex === -1 ? DESSERT_ORDER.length : rightIndex;

    if (leftOrder !== rightOrder) return leftOrder - rightOrder;

    return left.title.localeCompare(right.title);
  });
}

function positiveAmount(value: unknown) {
  const amount = Math.round(Number(value));

  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function quoteDessertSelection(input: {
  price: unknown;
  selection?: string | null;
  sizeVariants?: SizeVariant[] | null;
  selectedSize?: string | null;
}) {
  if (!decodeDessertSelection(input.selection)) {
    return { error: "This dessert has a fixed price." };
  }

  const sizes = input.sizeVariants ?? [];

  if (sizes.length > 0) {
    const size = sizes.find(
      (option) => option.name.toLowerCase() === (input.selectedSize ?? "").trim().toLowerCase(),
    );

    if (!size) return { error: "Please select an option." };

    const price = positiveAmount(size.price);

    if (price == null) return { error: "This option is not available." };

    return {
      base_price: price,
      protein_price: 0,
      price,
      selection: DESSERT_SELECTION,
    };
  }

  const price = positiveAmount(input.price);

  if (price == null) {
    return { error: "This dessert is not available at the menu price." };
  }

  return {
    base_price: price,
    protein_price: 0,
    price,
    selection: DESSERT_SELECTION,
  };
}
