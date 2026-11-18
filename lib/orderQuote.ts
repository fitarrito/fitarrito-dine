import type { menuItem } from "@/types/types";
import {
  decodeAsianStartersGravySelection,
  isAsianStartersGravyCuisine,
  quoteAsianStartersGravySelection,
  type AsianStartersGravyPriceOption,
} from "@lib/asianStartersGravyOrder";
import { quoteDessertSelection, isDessertsCategoryName } from "@lib/desserts";
import { getProteinNameForPricing } from "@lib/fitarritoHouseMenu";
import { calculateMenuItemPricing } from "@lib/menuPricing";
import { FIXED_MENU_SELECTION, isBlockedMenuTitle } from "@lib/menuVisibility";
import {
  decodePanAsianSelection,
  isPanAsianCuisine,
  quotePanAsianSelection,
  type PanAsianIngredient,
  type PanAsianPriceOption,
} from "@lib/panAsianOrder";
import { isSoupsCategoryName, quoteSoupSelection } from "@lib/soups";
import {
  quoteSoupsBowlsSelection,
  soupsBowlsPricesFor,
  type SoupsBowlsPriceOption,
} from "@lib/soupsBowlsOrder";

export type OrderQuote = {
  base_price: number;
  protein_price: number;
  price: number;
  selection: string;
};

function hasQuoteError(quote: { error?: string }): quote is { error: string } {
  return typeof quote.error === "string" && quote.error.length > 0;
}

function proteinVariants(item: menuItem) {
  return (item.proteinVariants ?? []).filter(
    (protein) => protein.name.trim().toLowerCase() !== "mutton",
  );
}

function quoteProtein(item: menuItem, selectedProtein?: string | null, selectedSize?: string | null) {
  const variants = proteinVariants(item);

  if (variants.length === 0) {
    const pricing = calculateMenuItemPricing(item, null, selectedSize);

    return { ...pricing, selection: FIXED_MENU_SELECTION };
  }

  const proteinName = getProteinNameForPricing(selectedProtein) ?? selectedProtein ?? "";
  const protein = variants.find(
    (entry) => entry.name.toLowerCase() === proteinName.trim().toLowerCase(),
  );

  if (!protein) {
    return { error: `Protein "${proteinName || "selection"}" is not available for this item.` };
  }

  const pricing = calculateMenuItemPricing(item, selectedProtein, selectedSize);

  return { ...pricing, selection: selectedProtein || protein.name };
}

export function quoteOrderItem(input: {
  item: menuItem;
  categoryName?: string | null;
  selectedProtein?: string | null;
  selectedSize?: string | null;
  panAsianPrices?: PanAsianPriceOption[];
  panAsianIngredients?: PanAsianIngredient[];
  asianStarterPrices?: AsianStartersGravyPriceOption[];
  soupsBowlsPrices?: SoupsBowlsPriceOption[];
}): OrderQuote | { error: string } {
  const item = input.item;

  if (isBlockedMenuTitle(item.title)) {
    return { error: "This dish is not on the menu." };
  }

  const selectedProtein = input.selectedProtein ?? "";
  const variants = proteinVariants(item);
  const dessert = isDessertsCategoryName(input.categoryName);
  const soup = isSoupsCategoryName(input.categoryName);

  if (dessert) {
    const quote = quoteDessertSelection({
      price: item.price,
      selection: selectedProtein,
      sizeVariants: item.sizeVariants,
      selectedSize: input.selectedSize,
    });

    if (hasQuoteError(quote)) return quote;

    return quote;
  }

  const soupsBowlsPrices = soupsBowlsPricesFor(item.title, input.soupsBowlsPrices);

  if (soup && soupsBowlsPrices.length > 0) {
    const quote = quoteSoupsBowlsSelection({
      title: item.title,
      selection: selectedProtein,
      prices: soupsBowlsPrices,
    });

    if (hasQuoteError(quote)) return quote;

    return quote;
  }

  if (soup && variants.length === 0) {
    const quote = quoteSoupSelection(item.price, selectedProtein);

    if (hasQuoteError(quote)) return quote;

    return quote;
  }

  if (isPanAsianCuisine(item.cuisine) && decodePanAsianSelection(selectedProtein)) {
    const quote = quotePanAsianSelection({
      title: item.title,
      selection: selectedProtein,
      prices: input.panAsianPrices ?? [],
      ingredients: input.panAsianIngredients ?? [],
    });

    if (hasQuoteError(quote)) return quote;

    return quote;
  }

  if (
    isAsianStartersGravyCuisine(item.cuisine) &&
    decodeAsianStartersGravySelection(selectedProtein)
  ) {
    const quote = quoteAsianStartersGravySelection({
      title: item.title,
      selection: selectedProtein,
      prices: input.asianStarterPrices ?? [],
    });

    if (hasQuoteError(quote)) return quote;

    return quote;
  }

  if (isPanAsianCuisine(item.cuisine) && variants.length === 0) {
    const quote = quotePanAsianSelection({
      title: item.title,
      selection: selectedProtein,
      prices: input.panAsianPrices ?? [],
      ingredients: input.panAsianIngredients ?? [],
    });

    if (hasQuoteError(quote)) return quote;

    return quote;
  }

  if (isAsianStartersGravyCuisine(item.cuisine) && variants.length === 0) {
    const quote = quoteAsianStartersGravySelection({
      title: item.title,
      selection: selectedProtein,
      prices: input.asianStarterPrices ?? [],
    });

    if (hasQuoteError(quote)) return quote;

    return quote;
  }

  return quoteProtein(item, selectedProtein, input.selectedSize);
}
