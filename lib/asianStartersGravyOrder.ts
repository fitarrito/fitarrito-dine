export const ASIAN_STARTERS_GRAVY_PROTEINS = ["Veg", "Chicken", "Prawn"] as const;

export const ASIAN_STARTERS_GRAVY_CATEGORIES = [
  "Fixed",
  ...ASIAN_STARTERS_GRAVY_PROTEINS,
] as const;

export type AsianStartersGravyCategory = (typeof ASIAN_STARTERS_GRAVY_CATEGORIES)[number];

export type AsianStartersGravyProtein = (typeof ASIAN_STARTERS_GRAVY_PROTEINS)[number];

export type AsianStartersGravyPriceOption = {
  id: number;
  dish_title: string;
  category: string;
  price: number;
  sort_order: number;
  is_available: boolean;
};

const STARTER_ORDER = [
  "Vietnamese Rice Paper Roll",
  "Salt & Pepper",
  "Chilli Basil",
  "Shanghai Crispy",
];

const GRAVY_ORDER = [
  "Mongolian Gravy",
  "Stir Fry Gravy",
  "Thai Red Curry",
  "Thai Green Curry",
];

export function isAsianStartersGravyCuisine(cuisine?: string | null) {
  return cuisine?.trim().toLowerCase() === "asian starters & gravy";
}

export function isAsianStartersGravyCategory(
  value: string,
): value is AsianStartersGravyCategory {
  return ASIAN_STARTERS_GRAVY_CATEGORIES.includes(value as AsianStartersGravyCategory);
}

export function isAsianStartersGravyProtein(
  value: string,
): value is AsianStartersGravyProtein {
  return ASIAN_STARTERS_GRAVY_PROTEINS.includes(value as AsianStartersGravyProtein);
}

export function encodeAsianStartersGravySelection(category: AsianStartersGravyCategory) {
  return `Asian Starters: ${category}`;
}

export function decodeAsianStartersGravySelection(value?: string | null) {
  const match = /^Asian Starters:\s*(Fixed|Veg|Chicken|Prawn)$/.exec(value?.trim() ?? "");

  if (!match || !isAsianStartersGravyCategory(match[1])) return null;

  return { category: match[1] };
}

function sortByTitle<T extends { title: string }>(items: T[], order: string[]) {
  return items.slice().sort((left, right) => {
    const leftIndex = order.indexOf(left.title);
    const rightIndex = order.indexOf(right.title);

    return (
      (leftIndex === -1 ? order.length : leftIndex) -
      (rightIndex === -1 ? order.length : rightIndex)
    );
  });
}

export function sortAsianStarterDishes<T extends { title: string }>(items: T[]) {
  return sortByTitle(items, STARTER_ORDER);
}

export function sortAsianGravyDishes<T extends { title: string }>(items: T[]) {
  return sortByTitle(items, GRAVY_ORDER);
}

export function availableAsianStartersGravyPrices(
  prices: AsianStartersGravyPriceOption[] | undefined,
  title: string,
) {
  return (prices ?? []).filter(
    (option) => option.dish_title === title && option.is_available && option.price > 0,
  );
}

export function quoteAsianStartersGravySelection(input: {
  title: string;
  selection: string;
  prices: AsianStartersGravyPriceOption[];
}) {
  const parsed = decodeAsianStartersGravySelection(input.selection);

  if (!parsed) {
    return { error: "Choose Veg, Chicken, or Prawn." };
  }

  const dishPrices = input.prices.filter(
    (option) => option.dish_title === input.title && option.is_available,
  );
  const fixedDish = dishPrices.some((option) => option.category === "Fixed");

  if (fixedDish && parsed.category !== "Fixed") {
    return { error: `${input.title} has a fixed price.` };
  }

  if (!fixedDish && parsed.category === "Fixed") {
    return { error: `Choose Veg, Chicken, or Prawn for ${input.title}.` };
  }

  const priceOption = dishPrices.find((option) => option.category === parsed.category);

  if (!priceOption) {
    return { error: `${parsed.category} is not available for ${input.title}.` };
  }

  const price = Number(priceOption.price);

  if (!Number.isFinite(price) || price <= 0) {
    return { error: `${input.title} is not available right now.` };
  }

  return {
    category: parsed.category,
    selection: encodeAsianStartersGravySelection(parsed.category),
    base_price: price,
    protein_price: 0,
    price,
    original_price: null as number | null,
  };
}
