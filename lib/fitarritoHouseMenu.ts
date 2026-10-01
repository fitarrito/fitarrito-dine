import type {
  menuItem,
  SaladVariant,
  ToppingVariant,
} from "@/types/types";

const SALAD_SELECTION_DELIMITER = "||";

export type SaladTypeOption = {
  name: string;
  imageUrl: string;
  objectPosition: string;
  description?: string;
};

export type SaladToppingOption = {
  name: string;
  emoji: string;
  imageUrl?: string;
};

export type DecodedSaladSelection = {
  saladType: string;
  protein: string;
  toppings: string[];
};

const SALAD_TYPE_IMAGES: Record<string, string> = {
  "peanut salad": "/images/menuimages/peanut-salad.png",
  "tabbouleh salad": "/images/menuimages/tabbouleh-salad.png",
  "fattoush salad": "/images/menuimages/fattoush-salad.png",
  "caesar salad": "/images/menuimages/caesar-salad.png",
};

const TOPPING_EMOJIS: Record<string, string> = {
  "roasted peanuts": "🥜",
  corn: "🌽",
  cucumber: "🥒",
  tomato: "🍅",
  olives: "🫒",
};

function resolveSaladImage(variant: Pick<SaladVariant, "name" | "imageUrl">) {
  if (variant.imageUrl) return variant.imageUrl;

  return (
    SALAD_TYPE_IMAGES[variant.name.trim().toLowerCase()] ??
    "/images/menuimages/salad.png"
  );
}

export function getSaladTypeOptions(item?: menuItem | null): SaladTypeOption[] {
  return (
    item?.saladVariants?.map((variant) => ({
      name: variant.name,
      description: variant.description,
      imageUrl: resolveSaladImage(variant),
      objectPosition: "center",
    })) ?? []
  );
}

export function getSaladToppingOptions(
  item?: menuItem | null,
): SaladToppingOption[] {
  return (
    item?.toppingVariants?.map((variant: ToppingVariant) => ({
      name: variant.name,
      imageUrl: variant.imageUrl,
      emoji: TOPPING_EMOJIS[variant.name.trim().toLowerCase()] ?? "🥗",
    })) ?? []
  );
}

export function isFitarritoHouseSalad(item: Pick<menuItem, "id" | "title">) {
  const title = item.title.trim().toLowerCase();
  const id = String(item.id).toLowerCase();

  return title === "salad" || title.includes("salad") || id.includes("salad");
}

export function encodeSaladProteinSelection({
  saladType,
  protein,
  toppings,
}: DecodedSaladSelection) {
  return [saladType, protein, toppings.join(", ")].join(
    SALAD_SELECTION_DELIMITER,
  );
}

export function decodeSaladProteinSelection(
  value?: string | null,
): DecodedSaladSelection | null {
  if (!value || !value.includes(SALAD_SELECTION_DELIMITER)) {
    return null;
  }

  const [saladType, protein, toppingsValue = ""] = value.split(
    SALAD_SELECTION_DELIMITER,
  );

  if (!saladType || !protein) {
    return null;
  }

  return {
    saladType,
    protein,
    toppings: toppingsValue
      .split(",")
      .map((topping) => topping.trim())
      .filter(Boolean),
  };
}

export function getProteinNameForPricing(selectedProtein?: string | null) {
  return decodeSaladProteinSelection(selectedProtein)?.protein ?? selectedProtein;
}

export function getCartItemCustomization(item: {
  title: string;
  selected_protein?: string | null;
  selected_size?: string | null;
}) {
  const salad = decodeSaladProteinSelection(item.selected_protein);

  if (!salad) {
    return {
      title: item.selected_size
        ? `${item.title} (${item.selected_size})`
        : item.title,
      protein: item.selected_protein ?? null,
      toppings: null as string | null,
    };
  }

  return {
    title: item.selected_size
      ? `${salad.saladType} (${item.selected_size})`
      : salad.saladType,
    protein: salad.protein,
    toppings: salad.toppings.length > 0 ? salad.toppings.join(", ") : null,
  };
}
