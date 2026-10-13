export const DESSERT_ORDER = [
  "Mango Sticky Rice",
  "Wanton Dates",
  "Water Chestnut",
] as const;

export type DessertTitle = (typeof DESSERT_ORDER)[number];

export const DESSERT_PRICES: Record<DessertTitle, number> = {
  "Mango Sticky Rice": 239,
  "Wanton Dates": 239,
  "Water Chestnut": 349,
};

const DESSERT_SELECTION = "Desserts: Fixed";

export function isDessertTitle(title?: string | null): title is DessertTitle {
  return DESSERT_ORDER.includes(title as DessertTitle);
}

export function encodeDessertSelection() {
  return DESSERT_SELECTION;
}

export function decodeDessertSelection(value?: string | null) {
  return value?.trim() === DESSERT_SELECTION ? { fixed: true as const } : null;
}

export function sortDessertDishes<T extends { title: string }>(items: T[]) {
  return items.slice().sort((left, right) => {
    const leftIndex = DESSERT_ORDER.indexOf(left.title as DessertTitle);
    const rightIndex = DESSERT_ORDER.indexOf(right.title as DessertTitle);

    return (
      (leftIndex === -1 ? DESSERT_ORDER.length : leftIndex) -
      (rightIndex === -1 ? DESSERT_ORDER.length : rightIndex)
    );
  });
}

export function quoteDessertSelection(title: string, selection?: string | null) {
  if (!isDessertTitle(title)) {
    return { error: "This dessert is not on the menu." };
  }

  if (!decodeDessertSelection(selection)) {
    return { error: `${title} has a fixed price.` };
  }

  const price = DESSERT_PRICES[title];

  return {
    base_price: price,
    protein_price: 0,
    price,
    selection: DESSERT_SELECTION,
  };
}
