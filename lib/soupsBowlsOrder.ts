import { decodePanAsianSelection } from "@lib/panAsianOrder";
import { decodeSoupSelection } from "@lib/soups";

export const SOUPS_BOWLS_SELECTION_PREFIX = "Soups & Bowls";

export const SOUPS_BOWLS_VEG_INGREDIENTS = [
  "Mushroom",
  "Broccoli",
  "Paneer",
  "Tofu",
] as const;

export type SoupsBowlsServing = "Soup" | "Bowl";
export type SoupsBowlsStoredProtein = "None" | "Veg" | "Chicken" | "Prawn";

export type SoupsBowlsSelection = {
  serving: SoupsBowlsServing;
  protein: SoupsBowlsStoredProtein;
  ingredient: string | null;
};

export type SoupsBowlsPriceOption = {
  id: number;
  dish_title: string;
  serving_type: SoupsBowlsServing;
  protein: SoupsBowlsStoredProtein;
  price: number;
  sort_order: number;
  is_available: boolean;
};

const STORED_PROTEINS: Record<string, SoupsBowlsStoredProtein> = {
  none: "None",
  veg: "Veg",
  chicken: "Chicken",
  prawn: "Prawn",
  seafood: "Prawn",
};

export function customerProteinLabel(protein: SoupsBowlsStoredProtein) {
  if (protein === "Prawn") return "Seafood";
  if (protein === "None") return null;

  return protein;
}

export function formatSoupsBowlsChoice(selection: SoupsBowlsSelection) {
  return [selection.serving, customerProteinLabel(selection.protein)].filter(Boolean).join(" · ");
}

export function encodeSoupsBowlsSelection(selection: SoupsBowlsSelection) {
  const parts = [SOUPS_BOWLS_SELECTION_PREFIX, selection.serving];

  if (selection.protein !== "None") {
    parts.push(selection.protein);
    if (selection.serving === "Bowl" && selection.protein === "Veg" && selection.ingredient) {
      parts.push(selection.ingredient);
    }
  }

  return parts.join(" · ");
}

export function decodeSoupsBowlsSelection(value?: string | null): SoupsBowlsSelection | null {
  const trimmed = value?.trim();

  if (!trimmed?.startsWith(`${SOUPS_BOWLS_SELECTION_PREFIX} · `)) return null;

  const [servingRaw, proteinRaw, ingredientRaw] = trimmed
    .slice(SOUPS_BOWLS_SELECTION_PREFIX.length)
    .replace(/^ · /, "")
    .split(" · ")
    .map((part) => part.trim());

  if (servingRaw === "Soup") {
    const protein = STORED_PROTEINS[(proteinRaw ?? "").toLowerCase()];

    if (!protein || protein === "None") {
      return { serving: "Soup", protein: "None", ingredient: null };
    }

    return { serving: "Soup", protein, ingredient: null };
  }

  if (servingRaw !== "Bowl") return null;

  const protein = STORED_PROTEINS[(proteinRaw ?? "").toLowerCase()];

  if (!protein || protein === "None") return null;

  if (protein !== "Veg") {
    return { serving: "Bowl", protein, ingredient: null };
  }

  if (!ingredientRaw) {
    return { serving: "Bowl", protein, ingredient: null };
  }

  const ingredient = SOUPS_BOWLS_VEG_INGREDIENTS.find(
    (name) => name.toLowerCase() === ingredientRaw.toLowerCase(),
  );

  if (!ingredient) return null;

  return { serving: "Bowl", protein, ingredient };
}

function legacySoupsBowlsSelection(value?: string | null): SoupsBowlsSelection | null {
  if (decodeSoupSelection(value)) {
    return { serving: "Soup", protein: "None", ingredient: null };
  }

  const pan = decodePanAsianSelection(value);

  if (!pan) return null;

  const protein: SoupsBowlsStoredProtein =
    pan.category === "Seafood" ? "Prawn" : pan.category === "Chicken" ? "Chicken" : "Veg";
  const ingredient =
    protein === "Veg"
      ? SOUPS_BOWLS_VEG_INGREDIENTS.find((name) =>
          pan.ingredients.some((entry) => entry.toLowerCase() === name.toLowerCase()),
        ) ?? null
      : null;

  return { serving: "Bowl", protein, ingredient };
}

export function soupsBowlsPricesFor(
  title: string,
  prices?: SoupsBowlsPriceOption[] | null,
) {
  return (prices ?? []).filter(
    (row) =>
      row.dish_title === title &&
      row.is_available !== false &&
      Number(row.price) > 0,
  );
}

export function quoteSoupsBowlsSelection(input: {
  title: string;
  selection?: string | null;
  prices: SoupsBowlsPriceOption[];
}) {
  const parsed =
    decodeSoupsBowlsSelection(input.selection) ?? legacySoupsBowlsSelection(input.selection);

  if (!parsed || parsed.protein === "None") {
    return { error: "Choose Veg, Chicken, or Seafood." };
  }

  const match = soupsBowlsPricesFor(input.title, input.prices).find(
    (row) => row.serving_type === parsed.serving && row.protein === parsed.protein,
  );
  const amount = Number(match?.price);

  if (!match || !Number.isFinite(amount) || amount <= 0) {
    return {
      error:
        parsed.serving === "Soup"
          ? "Soup is not available for this dish."
          : "That bowl is not available for this dish.",
    };
  }

  const selection: SoupsBowlsSelection = {
    serving: parsed.serving,
    protein: parsed.protein,
    ingredient: null,
  };
  const price = Math.round(amount);

  return {
    base_price: price,
    protein_price: 0,
    price,
    selection: encodeSoupsBowlsSelection(selection),
    servingType: selection.serving,
    selectedIngredient: selection.ingredient,
    storedProtein: selection.protein,
  };
}
