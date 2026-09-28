import type {
  menuItem,
  ProteinVariant,
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

export const SALAD_TYPE_OPTIONS: SaladTypeOption[] = [
  {
    name: "Peanut Salad",
    imageUrl: SALAD_TYPE_IMAGES["peanut salad"],
    objectPosition: "center",
    description: "Fresh vegetables with creamy peanut dressing.",
  },
  {
    name: "Tabbouleh Salad",
    imageUrl: SALAD_TYPE_IMAGES["tabbouleh salad"],
    objectPosition: "center",
    description: "Fresh parsley, mint, tomato, cucumber and grains.",
  },
  {
    name: "Fattoush Salad",
    imageUrl: SALAD_TYPE_IMAGES["fattoush salad"],
    objectPosition: "center",
    description: "Crisp greens, vegetables, herbs and toasted pita.",
  },
  {
    name: "Caesar Salad",
    imageUrl: SALAD_TYPE_IMAGES["caesar salad"],
    objectPosition: "center",
    description: "Crisp greens, Caesar dressing, Parmesan and croutons.",
  },
];

export const SALAD_TOPPING_OPTIONS: SaladToppingOption[] = [
  { name: "Roasted Peanuts", emoji: "🥜" },
  { name: "Corn", emoji: "🌽" },
  { name: "Cucumber", emoji: "🥒" },
  { name: "Tomato", emoji: "🍅" },
  { name: "Olives", emoji: "🫒" },
];

export const FITARRITO_HOUSE_TITLES = [
  "Pasta Bowl",
  "Crunchy Quinoa Bowl",
  "Udon Noodles",
  "Salads",
  "Salad",
];

function resolveSaladImage(variant: Pick<SaladVariant, "name" | "imageUrl">) {
  if (variant.imageUrl) return variant.imageUrl;

  return (
    SALAD_TYPE_IMAGES[variant.name.trim().toLowerCase()] ??
    "/images/menuimages/salad.png"
  );
}

export function getSaladTypeOptions(item?: menuItem | null): SaladTypeOption[] {
  if (item?.saladVariants && item.saladVariants.length > 0) {
    return item.saladVariants.map((variant) => ({
      name: variant.name,
      description: variant.description,
      imageUrl: resolveSaladImage(variant),
      objectPosition: "center",
    }));
  }

  return SALAD_TYPE_OPTIONS;
}

export function getSaladToppingOptions(
  item?: menuItem | null,
): SaladToppingOption[] {
  if (item?.toppingVariants && item.toppingVariants.length > 0) {
    return item.toppingVariants.map((variant: ToppingVariant) => ({
      name: variant.name,
      imageUrl: variant.imageUrl,
      emoji: TOPPING_EMOJIS[variant.name.trim().toLowerCase()] ?? "🥗",
    }));
  }

  return SALAD_TOPPING_OPTIONS;
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

const HOUSE_PROTEIN_VARIANTS: ProteinVariant[] = [
  {
    name: "Veggies Only",
    type: "veg",
    price: 0,
    imageUrl: "/images/menuimages/proteinImages/VeggiesIcon.svg",
  },
  {
    name: "Mushroom",
    type: "veg",
    price: 60,
    imageUrl: "/images/menuimages/proteinImages/MushroomIcon.svg",
  },
  {
    name: "Paneer",
    type: "veg",
    price: 70,
    imageUrl: "/images/menuimages/proteinImages/PaneerIcon.svg",
  },
  {
    name: "Tofu",
    type: "veg",
    price: 70,
    imageUrl: "/images/menuimages/proteinImages/TofuIcon.png",
  },
  {
    name: "Chicken",
    type: "non-veg",
    price: 80,
    imageUrl: "/images/menuimages/proteinImages/ChickenIcon.svg",
  },
  {
    name: "Prawn",
    type: "non-veg",
    price: 90,
    imageUrl: "/images/menuimages/proteinImages/PrawnIcon.png",
  },
];

const HOUSE_SIZE_VARIANTS = [
  { name: "Mini", price: 199 },
  { name: "Regular", price: 279 },
];

function createHouseItem(
  id: string,
  title: string,
  description: string,
  imageUrl: string,
): menuItem {
  return {
    id,
    title,
    description,
    imageUrl,
    imagesrc: { src: imageUrl },
    price: 199,
    categoryId: 0,
    rating: 0,
    reviews: "",
    url: "",
    cuisine: "Fitarrito House",
    order_type: "on_demand",
    sizeVariants: HOUSE_SIZE_VARIANTS,
    proteinVariants: HOUSE_PROTEIN_VARIANTS,
  };
}

export const FITARRITO_HOUSE_ITEMS: menuItem[] = [
  createHouseItem(
    "fitarrito-house-pasta-bowl",
    "Pasta Bowl",
    "Hearty pasta tossed in flavourful sauces with fresh veggies.",
    "/images/menuimages/pasta-bowl.png",
  ),
  createHouseItem(
    "fitarrito-house-crunchy-quinoa-bowl",
    "Crunchy Quinoa Bowl",
    "Nutritious quinoa with colourful veggies and signature dressings.",
    "/images/menuimages/crunchy-quinoa-bowl.png",
  ),
  createHouseItem(
    "fitarrito-house-udon-noodles",
    "Udon Noodles",
    "Chewy udon noodles tossed with fresh veggies and bold sauces.",
    "/images/menuimages/udon-noodles.png",
  ),
  createHouseItem(
    "fitarrito-house-salad",
    "Salad",
    "Fresh greens with wholesome toppings and signature dressings.",
    "/images/menuimages/salad.png",
  ),
];

export const FITARRITO_HOUSE_IMAGE_FALLBACKS: Record<string, string> = {
  "pasta bowl": "/images/menuimages/pasta-bowl.png",
  "crunchy quinoa bowl": "/images/menuimages/crunchy-quinoa-bowl.png",
  "udon noodles": "/images/menuimages/udon-noodles.png",
  salad: "/images/menuimages/salad.png",
};
