export const PAN_ASIAN_CATEGORIES = ["Veg", "Chicken", "Seafood"] as const;

export type PanAsianCategory = (typeof PAN_ASIAN_CATEGORIES)[number];

export type PanAsianPriceOption = {
  id: number;
  dish_title: string;
  category: string;
  price: number;
  sort_order: number;
  is_available: boolean;
};

export type PanAsianIngredient = {
  id: number;
  dish_title: string;
  category: string;
  ingredient_name: string;
  extra_price: number;
  sort_order: number;
  is_available: boolean;
};

const DISH_ORDER = [
  "Korean Bibimbap",
  "Japanese Ramen",
  "Laksa",
  "Tom Yum Noodle Bowl",
  "Mala Xiang Guo",
  "Malatang",
];

const INGREDIENT_ORDER = ["Mushroom", "Broccoli", "Paneer", "Tofu", "Chicken", "Prawn"];

export function isPanAsianCuisine(cuisine?: string | null) {
  return cuisine?.trim().toLowerCase() === "pan asian";
}

export function isPanAsianCategory(value: string): value is PanAsianCategory {
  return PAN_ASIAN_CATEGORIES.includes(value as PanAsianCategory);
}

export function encodePanAsianSelection(category: string, ingredients: string[]) {
  return `${category}: ${ingredients.join(", ")}`;
}

export function decodePanAsianSelection(value?: string | null) {
  if (!value) return null;

  const match = /^(Veg|Chicken|Seafood):\s*(.+)$/.exec(value.trim());

  if (!match) return null;

  const ingredients = match[2]
    .split(",")
    .map((ingredient) => ingredient.trim())
    .filter(Boolean);

  if (ingredients.length === 0) return null;

  return {
    category: match[1] as PanAsianCategory,
    ingredients,
  };
}

export function sortPanAsianDishes<T extends { title: string }>(items: T[]) {
  return items.slice().sort((left, right) => {
    const leftIndex = DISH_ORDER.indexOf(left.title);
    const rightIndex = DISH_ORDER.indexOf(right.title);

    return (leftIndex === -1 ? DISH_ORDER.length : leftIndex) -
      (rightIndex === -1 ? DISH_ORDER.length : rightIndex);
  });
}

export function sortPanAsianIngredients(ingredients: PanAsianIngredient[]) {
  return ingredients.slice().sort((left, right) => {
    const leftIndex = INGREDIENT_ORDER.indexOf(left.ingredient_name);
    const rightIndex = INGREDIENT_ORDER.indexOf(right.ingredient_name);
    const leftOrder = leftIndex === -1 ? left.sort_order + INGREDIENT_ORDER.length : leftIndex;
    const rightOrder = rightIndex === -1 ? right.sort_order + INGREDIENT_ORDER.length : rightIndex;

    return leftOrder - rightOrder;
  });
}

export function quotePanAsianSelection(input: {
  title: string;
  selection: string;
  prices: PanAsianPriceOption[];
  ingredients: PanAsianIngredient[];
}) {
  const parsed = decodePanAsianSelection(input.selection);

  if (!parsed) {
    return { error: "Choose Veg, Chicken, or Seafood." };
  }

  const priceOption = input.prices.find(
    (option) =>
      option.dish_title === input.title &&
      option.category === parsed.category &&
      option.is_available,
  );

  if (!priceOption) {
    return { error: `${parsed.category} is not available for ${input.title}.` };
  }

  const allowed = sortPanAsianIngredients(
    input.ingredients.filter(
      (ingredient) =>
        ingredient.dish_title === input.title &&
        ingredient.category === parsed.category &&
        ingredient.is_available,
    ),
  );
  const allowedNames = new Set(allowed.map((ingredient) => ingredient.ingredient_name));
  const uniqueIngredients = [...new Set(parsed.ingredients)];

  if (parsed.category === "Veg" && uniqueIngredients.length !== 1) {
    return { error: "Select one veg ingredient." };
  }

  if (uniqueIngredients.length === 0) {
    return { error: "Select one ingredient." };
  }

  const unknown = uniqueIngredients.find((ingredient) => !allowedNames.has(ingredient));

  if (unknown) {
    return { error: `${unknown} is not available for ${parsed.category} ${input.title}.` };
  }

  if (parsed.category !== "Veg") {
    const expected = allowed.map((ingredient) => ingredient.ingredient_name);

    if (
      uniqueIngredients.length !== expected.length ||
      expected.some((ingredient) => !uniqueIngredients.includes(ingredient))
    ) {
      return { error: `Choose the ${parsed.category.toLowerCase()} option for ${input.title}.` };
    }
  }

  const price = Number(priceOption.price);

  return {
    category: parsed.category,
    ingredients: uniqueIngredients,
    selection: encodePanAsianSelection(parsed.category, uniqueIngredients),
    base_price: price,
    protein_price: 0,
    price,
    original_price: null as number | null,
  };
}
