import type { menuItem } from "@/types/types";
import {
  availableAsianStartersGravyPrices,
  decodeAsianStartersGravySelection,
  encodeAsianStartersGravySelection,
  isAsianStartersGravyCuisine,
  quoteAsianStartersGravySelection,
  isAsianGravyDish,
  sortAsianStarterDishes,
  type AsianStartersGravyCategory,
} from "@lib/asianStartersGravyOrder";
import {
  encodeDessertSelection,
  isDessertsCategoryName,
  quoteDessertSelection,
  sortDessertDishes,
} from "@lib/desserts";
import {
  decodeSaladProteinSelection,
  encodeSaladProteinSelection,
  isFitarritoHouseSalad,
} from "@lib/fitarritoHouseMenu";
import { quoteSizePrice } from "@lib/mexicanMiniOffer";
import {
  calculateMenuItemPricing,
  getAvailableProteinVariants,
} from "@lib/menuPricing";
import {
  decodePanAsianSelection,
  encodePanAsianSelection,
  isPanAsianCategory,
  isPanAsianCuisine,
  quotePanAsianSelection,
  sortPanAsianDishes,
  sortPanAsianIngredients,
  type PanAsianCategory,
} from "@lib/panAsianOrder";
import { readFormatOptions, resolveItemFormat } from "@lib/menuFormat";
import { FIXED_MENU_SELECTION, isBlockedMenuTitle } from "@lib/menuVisibility";
import { isMalaCategoryName, sortMalaDishes } from "@lib/mala";
import { encodeSoupSelection, isSoupsCategoryName, quoteSoupSelection, sortSoupsAndBowls } from "@lib/soups";
import {
  decodeSoupsBowlsSelection,
  encodeSoupsBowlsSelection,
  formatSoupsBowlsChoice,
  quoteSoupsBowlsSelection,
  soupsBowlsPricesFor,
  type SoupsBowlsServing,
} from "@lib/soupsBowlsOrder";

export const WAITER_MENU_GROUPS = [
  { id: "all", label: "All" },
  { id: "soups", label: "Soups & Bowls" },
  { id: "mexican", label: "Mexican" },
  { id: "pan-asian", label: "Pan Asian" },
  { id: "mala", label: "Mala" },
  { id: "asian-starters-gravy", label: "Asian Starters" },
  { id: "desserts", label: "Desserts" },
  { id: "beverages", label: "Beverages" },
] as const;

export type WaiterMenuGroupId = (typeof WAITER_MENU_GROUPS)[number]["id"];

export type WaiterDishGroup = Exclude<WaiterMenuGroupId, "all">;

export type WaiterChoice = {
  selectedProtein: string;
  selectedSize?: string;
  itemFormat?: string | null;
  price: number;
  summary: string;
};

export type WaiterChoiceInput = {
  size?: string | null;
  protein?: string | null;
  serving?: SoupsBowlsServing | null;
  panCategory?: PanAsianCategory | null;
  ingredient?: string | null;
  starterCategory?: AsianStartersGravyCategory | null;
  saladType?: string | null;
  toppings?: string[];
  itemFormat?: string | null;
};

const GROUP_ORDER: WaiterDishGroup[] = [
  "soups",
  "mexican",
  "pan-asian",
  "mala",
  "asian-starters-gravy",
  "desserts",
  "beverages",
];

export type WaiterMenuCategory = {
  id: number;
  name: string;
};

export type WaiterMenuBlock = {
  title: string | null;
  items: menuItem[];
};

export type WaiterMenuSection = {
  group: WaiterDishGroup;
  label: string;
  blocks: WaiterMenuBlock[];
};

export function waiterGroupLabel(group: WaiterDishGroup) {
  return WAITER_MENU_GROUPS.find((entry) => entry.id === group)?.label ?? group;
}

function categoryNameFor(item: menuItem, categories: WaiterMenuCategory[]) {
  return (
    categories.find((category) => Number(category.id) === Number(item.categoryId))?.name ??
    item.category ??
    ""
  );
}

export function waiterGroupForItem(
  item: menuItem,
  categories: WaiterMenuCategory[] = [],
): WaiterDishGroup | null {
  if ((item.order_type ?? "on_demand") !== "on_demand") return null;
  if (isBlockedMenuTitle(item.title)) return null;
  if (item.is_available === false) return null;

  const categoryName = categoryNameFor(item, categories);

  if (isDessertsCategoryName(categoryName)) return "desserts";
  if (isSoupsCategoryName(categoryName)) return "soups";
  if (isMalaCategoryName(categoryName)) return "mala";

  if (isAsianStartersGravyCuisine(item.cuisine)) {
    if (isAsianGravyDish(item)) return null;

    return "asian-starters-gravy";
  }

  const cuisine = item.cuisine?.trim().toLowerCase();

  if (cuisine === "mexican") return "mexican";
  if (cuisine === "beverages") return "beverages";
  if (!isPanAsianCuisine(item.cuisine)) return null;

  const hasPrices = (item.panAsianPrices?.length ?? 0) > 0;
  const hasVariants =
    (item.proteinVariants?.length ?? 0) > 0 || (item.sizeVariants?.length ?? 0) > 0;

  return hasPrices || hasVariants ? "pan-asian" : null;
}

export function sortWaiterDishes(items: menuItem[], group: WaiterDishGroup) {
  if (group === "pan-asian") return sortPanAsianDishes(items);
  if (group === "mala") return sortMalaDishes(items);
  if (group === "desserts") return sortDessertDishes(items);
  if (group === "soups") return sortSoupsAndBowls(items);

  if (group === "asian-starters-gravy") {
    return sortAsianStarterDishes(items.filter((item) => !isAsianGravyDish(item)));
  }

  return items.slice().sort((left, right) => left.title.localeCompare(right.title));
}

function sectionLabel(group: WaiterDishGroup, categories: WaiterMenuCategory[]) {
  if (group === "soups") {
    return categories.find((category) => isSoupsCategoryName(category.name))?.name ?? waiterGroupLabel(group);
  }

  return waiterGroupLabel(group);
}

function blocksForGroup(
  group: WaiterDishGroup,
  items: menuItem[],
  categories: WaiterMenuCategory[],
): WaiterMenuBlock[] {
  if (group === "mexican") {
    const ordered = categories
      .filter((category) =>
        items.some((item) => Number(item.categoryId) === Number(category.id)),
      )
      .sort((left, right) => left.id - right.id);
    const used = new Set(ordered.map((category) => Number(category.id)));
    const blocks: WaiterMenuBlock[] = ordered.map((category) => ({
      title: category.name,
      items: items.filter((item) => Number(item.categoryId) === Number(category.id)),
    }));
    const rest = items.filter((item) => !used.has(Number(item.categoryId)));

    if (rest.length > 0) {
      blocks.push({
        title: null,
        items: rest.slice().sort((left, right) => left.title.localeCompare(right.title)),
      });
    }

    return blocks;
  }

  if (group === "pan-asian") {
    const priced = sortPanAsianDishes(
      items.filter((item) => (item.panAsianPrices?.length ?? 0) > 0),
    );
    const extras = items.filter((item) => (item.panAsianPrices?.length ?? 0) === 0);
    const blocks: WaiterMenuBlock[] = [];

    if (priced.length > 0) blocks.push({ title: null, items: priced });

    const extraCategories = categories
      .filter((category) =>
        extras.some((item) => Number(item.categoryId) === Number(category.id)),
      )
      .sort((left, right) => left.id - right.id);
    const used = new Set(extraCategories.map((category) => Number(category.id)));

    for (const category of extraCategories) {
      blocks.push({
        title: category.name,
        items: extras
          .filter((item) => Number(item.categoryId) === Number(category.id))
          .sort((left, right) => left.title.localeCompare(right.title)),
      });
    }

    const rest = extras.filter((item) => !used.has(Number(item.categoryId)));

    if (rest.length > 0) {
      blocks.push({
        title: priced.length > 0 ? "Pan Asian" : null,
        items: rest.slice().sort((left, right) => left.title.localeCompare(right.title)),
      });
    }

    return blocks;
  }

  return [{ title: null, items: sortWaiterDishes(items, group) }];
}

function pricedAmount(value: unknown) {
  const amount = Math.round(Number(value));

  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function listPlusMinProtein(item: menuItem) {
  const sizes = sizePriceLines(item);
  const base = sizes.length
    ? Math.min(...sizes.map((size) => size.price))
    : pricedAmount(item.price);

  if (base == null || base <= 0) return null;

  const proteins = getAvailableProteinVariants(item, sizes[0]?.name);
  const extra = proteins.reduce((lowest, protein) => {
    const price = Number(protein.price) || 0;

    return Math.min(lowest, price);
  }, proteins.length ? Number.POSITIVE_INFINITY : 0);

  return base + (Number.isFinite(extra) ? extra : 0);
}

function hasPanCatalog(item: menuItem) {
  return (item.panAsianPrices ?? []).some(
    (option) => option.is_available && Number(option.price) > 0,
  );
}

function hasSoupsBowlsCatalog(item: menuItem) {
  return soupsBowlsPricesFor(item.title, item.soupsBowlsPrices).length > 0;
}

function usesPanCatalog(item: menuItem, group: WaiterDishGroup) {
  if (hasSoupsBowlsCatalog(item)) return false;

  return (group === "pan-asian" || group === "mala" || group === "soups") && hasPanCatalog(item);
}

function hasStarterCatalog(item: menuItem) {
  return availableAsianStartersGravyPrices(item.asianStartersGravyPrices, item.title).length > 0;
}

export function groupWaiterMenu(
  items: menuItem[],
  categories: WaiterMenuCategory[] = [],
): WaiterMenuSection[] {
  const grouped = new Map<WaiterDishGroup, menuItem[]>();

  for (const item of items) {
    const group = waiterGroupForItem(item, categories);

    if (!group) continue;
    if (waiterStartingPrice(item, group) == null) continue;

    const current = grouped.get(group) ?? [];
    current.push(item);
    grouped.set(group, current);
  }

  return GROUP_ORDER.flatMap((group) => {
    const dishes = grouped.get(group);

    if (!dishes?.length) return [];

    return [
      {
        group,
        label: sectionLabel(group, categories),
        blocks: blocksForGroup(group, dishes, categories),
      },
    ];
  });
}

function sizePriceLines(item: menuItem) {
  return (item.sizeVariants ?? []).map((size) => ({
    name: size.name,
    price: quoteSizePrice(item, size, Number(item.price)).price,
  }));
}

export function waiterStartingPrice(item: menuItem, group: WaiterDishGroup) {
  if (group === "beverages") return listPlusMinProtein(item);

  if (group === "soups") {
    if (hasSoupsBowlsCatalog(item)) {
      const rows = soupsBowlsPricesFor(item.title, item.soupsBowlsPrices);
      const soupPrices = rows
        .filter((row) => row.serving_type === "Soup")
        .map((row) => Number(row.price));
      const prices = soupPrices.length ? soupPrices : rows.map((row) => Number(row.price));

      return prices.length ? Math.round(Math.min(...prices)) : null;
    }

    if (hasPanCatalog(item)) {
      const prices = (item.panAsianPrices ?? [])
        .filter((option) => option.is_available && Number(option.price) > 0)
        .map((option) => Number(option.price));

      return prices.length ? Math.min(...prices) : null;
    }

    if ((item.proteinVariants?.length ?? 0) > 0) return listPlusMinProtein(item);

    const quote = quoteSoupSelection(item.price, encodeSoupSelection());
    return "error" in quote ? null : quote.price;
  }

  if (group === "desserts") {
    const quote = quoteDessertSelection({
      price: item.price,
      selection: encodeDessertSelection(),
      sizeVariants: item.sizeVariants,
      selectedSize: item.sizeVariants?.[0]?.name,
    });

    return "error" in quote ? null : quote.price;
  }

  if (usesPanCatalog(item, group)) {
    const prices = (item.panAsianPrices ?? [])
      .filter((option) => option.is_available && Number(option.price) > 0)
      .map((option) => Number(option.price));

    return prices.length ? Math.min(...prices) : null;
  }

  if (group === "asian-starters-gravy" && hasStarterCatalog(item) && (item.proteinVariants?.length ?? 0) === 0) {
    const prices = availableAsianStartersGravyPrices(
      item.asianStartersGravyPrices,
      item.title,
    ).map((option) => Number(option.price));

    return prices.length ? Math.min(...prices) : null;
  }

  const sizes = sizePriceLines(item);

  if (sizes.length) return Math.min(...sizes.map((size) => size.price));

  const listPrice = Number(item.price);

  return Number.isFinite(listPrice) && listPrice > 0 ? Math.round(listPrice) : null;
}

export function waiterPriceLine(item: menuItem, group: WaiterDishGroup) {
  if (group === "mexican") {
    const sizes = sizePriceLines(item);

    if (sizes.length > 1) {
      return sizes.map((size) => `${size.name} ₹${Math.round(size.price)}`).join(" · ");
    }
  }

  if (usesPanCatalog(item, group)) {
    const options = (item.panAsianPrices ?? [])
      .filter((option) => option.is_available && isPanAsianCategory(option.category))
      .sort((left, right) => left.sort_order - right.sort_order);

    if (options.length > 1) {
      return options
        .map((option) => `${option.category} ₹${Math.round(Number(option.price))}`)
        .join(" · ");
    }
  }

  const starting = waiterStartingPrice(item, group);

  if (starting == null) return "";

  return waiterNeedsCustomization(item, group)
    ? `From ₹${Math.round(starting)}`
    : `₹${Math.round(starting)}`;
}

export function waiterNeedsCustomization(item: menuItem, group: WaiterDishGroup) {
  if (group === "beverages") return (item.proteinVariants?.length ?? 0) > 0 || (item.sizeVariants?.length ?? 0) > 0;

  if (group === "soups") {
    if (hasSoupsBowlsCatalog(item)) return true;

    return hasPanCatalog(item) || (item.proteinVariants?.length ?? 0) > 0;
  }

  if (group === "desserts") return (item.sizeVariants?.length ?? 0) > 0;

  if (group === "asian-starters-gravy" && hasStarterCatalog(item) && (item.proteinVariants?.length ?? 0) === 0) {
    const prices = availableAsianStartersGravyPrices(
      item.asianStartersGravyPrices,
      item.title,
    );

    return !(prices.length === 1 && prices[0]?.category === "Fixed");
  }

  if (usesPanCatalog(item, group) || isFitarritoHouseSalad(item)) return true;

  const sizes = item.sizeVariants ?? [];
  const proteins = getAvailableProteinVariants(item, sizes[0]?.name);

  return sizes.length > 0 || proteins.length > 0;
}

export function waiterInputFromCart(input: {
  group: WaiterDishGroup;
  selectedProtein?: string | null;
  selectedSize?: string | null;
  itemFormat?: string | null;
}): WaiterChoiceInput {
  if (input.group === "soups") {
    const bowls = decodeSoupsBowlsSelection(input.selectedProtein);

    if (bowls) {
      return {
        serving: bowls.serving,
        panCategory:
          bowls.protein === "Prawn"
            ? "Seafood"
            : bowls.protein === "Veg" || bowls.protein === "Chicken"
              ? bowls.protein
              : null,
        ingredient: bowls.ingredient,
      };
    }
  }

  if (input.group === "pan-asian" || input.group === "soups") {
    const decoded = decodePanAsianSelection(input.selectedProtein);

    if (decoded) {
      return {
        panCategory: decoded.category,
        ingredient: decoded.category === "Veg" ? decoded.ingredients[0] : null,
        itemFormat: input.itemFormat,
      };
    }
  }

  if (input.group === "asian-starters-gravy") {
    const decoded = decodeAsianStartersGravySelection(input.selectedProtein);

    if (decoded) return { starterCategory: decoded.category };
  }

  const salad = decodeSaladProteinSelection(input.selectedProtein);

  if (salad) {
    return {
      saladType: salad.saladType,
      protein: salad.protein,
      toppings: salad.toppings,
      size: input.selectedSize,
    };
  }

  return {
    size: input.selectedSize,
    protein: input.selectedProtein,
  };
}

function selectionQuote(
  quote: { error?: string; selection?: string; price?: number },
  summary?: string,
): WaiterChoice | { error: string } {
  if (!quote.selection || quote.price == null || quote.error) {
    return { error: quote.error ?? "This option is not available." };
  }

  return {
    selectedProtein: quote.selection,
    price: quote.price,
    summary: summary ?? quote.selection,
  };
}

export function immediateWaiterChoice(
  item: menuItem,
  group: WaiterDishGroup,
): WaiterChoice | { error: string } | null {
  if (waiterNeedsCustomization(item, group)) return null;

  if (group === "soups") {
    if (hasSoupsBowlsCatalog(item)) return null;

    return selectionQuote(quoteSoupSelection(item.price, encodeSoupSelection()), item.title);
  }

  if (group === "desserts") {
    const quote = quoteDessertSelection({
      price: item.price,
      selection: encodeDessertSelection(),
      sizeVariants: item.sizeVariants,
      selectedSize: item.sizeVariants?.[0]?.name,
    });

    return selectionQuote(quote, item.title);
  }

  if (group === "beverages") {
    const price = listPlusMinProtein(item);

    if (price == null) return { error: "This drink is not available." };

    return {
      selectedProtein: FIXED_MENU_SELECTION,
      price,
      summary: item.title,
    };
  }

  if (group === "asian-starters-gravy") {
    return quoteWaiterChoice(item, group, { starterCategory: "Fixed" });
  }

  const price = listPlusMinProtein(item);

  if (
    price != null &&
    (item.proteinVariants?.length ?? 0) === 0 &&
    (item.sizeVariants?.length ?? 0) === 0
  ) {
    return {
      selectedProtein: FIXED_MENU_SELECTION,
      price,
      summary: item.title,
    };
  }

  return { error: "Choose the options for this dish." };
}

export function quoteWaiterChoice(
  item: menuItem,
  group: WaiterDishGroup,
  input: WaiterChoiceInput,
): WaiterChoice | { error: string } {
  if (group === "desserts") {
    if ((item.sizeVariants?.length ?? 0) > 0 && !input.size) {
      return { error: "Please select an option." };
    }

    const quote = quoteDessertSelection({
      price: item.price,
      selection: encodeDessertSelection(),
      sizeVariants: item.sizeVariants,
      selectedSize: input.size,
    });
    const priced = selectionQuote(quote, input.size ? `${item.title} · ${input.size}` : item.title);

    if ("error" in priced) return priced;

    return { ...priced, selectedSize: input.size || undefined };
  }

  if (group === "soups" && hasSoupsBowlsCatalog(item)) {
    const serving = input.serving === "Bowl" ? "Bowl" : "Soup";

    if (!input.panCategory) {
      return { error: "Choose Veg, Chicken, or Seafood." };
    }

    const protein =
      input.panCategory === "Seafood"
        ? "Prawn"
        : input.panCategory === "Chicken"
          ? "Chicken"
          : "Veg";
    const selection = {
      serving,
      protein,
      ingredient: null,
    } as const;
    const quote = quoteSoupsBowlsSelection({
      title: item.title,
      selection: encodeSoupsBowlsSelection(selection),
      prices: item.soupsBowlsPrices ?? [],
    });

    return selectionQuote(quote, `${item.title} · ${formatSoupsBowlsChoice(selection)}`);
  }

  if (group === "soups" && !hasPanCatalog(item) && (item.proteinVariants?.length ?? 0) === 0) {
    return selectionQuote(quoteSoupSelection(item.price, encodeSoupSelection()), item.title);
  }

  if (group === "beverages" && (item.proteinVariants?.length ?? 0) === 0 && (item.sizeVariants?.length ?? 0) === 0) {
    const price = listPlusMinProtein(item);

    if (price == null) return { error: "This drink is not available." };

    return {
      selectedProtein: FIXED_MENU_SELECTION,
      price,
      summary: item.title,
    };
  }

  if (usesPanCatalog(item, group)) {
    if (!input.panCategory) return { error: "Choose Veg, Chicken, or Seafood." };

    const catalog = item.panAsianIngredients ?? [];
    const allowed = sortPanAsianIngredients(
      catalog.filter(
        (ingredient) =>
          ingredient.dish_title === item.title &&
          ingredient.category === input.panCategory &&
          ingredient.is_available,
      ),
    );
    const ingredients =
      input.panCategory === "Veg"
        ? input.ingredient
          ? [input.ingredient]
          : []
        : allowed.map((ingredient) => ingredient.ingredient_name);
    const selection = encodePanAsianSelection(input.panCategory, ingredients);
    const quote = quotePanAsianSelection({
      title: item.title,
      selection,
      prices: item.panAsianPrices ?? [],
      ingredients: catalog,
    });

    const quoted = selectionQuote(quote);

    if ("error" in quoted) return quoted;

    const format = resolveItemFormat(readFormatOptions(item.formatOptions), input.itemFormat);

    if ("error" in format) return format;

    return {
      ...quoted,
      itemFormat: format.itemFormat,
      summary: [format.itemFormat, quoted.summary].filter(Boolean).join(" · "),
    };
  }

  if (group === "asian-starters-gravy" && hasStarterCatalog(item) && (item.proteinVariants?.length ?? 0) === 0) {
    if (!input.starterCategory) return { error: "Choose Veg, Chicken, or Prawn." };

    const selection = encodeAsianStartersGravySelection(input.starterCategory);
    const quote = quoteAsianStartersGravySelection({
      title: item.title,
      selection,
      prices: item.asianStartersGravyPrices ?? [],
    });

    return selectionQuote(
      quote,
      input.starterCategory === "Fixed" ? item.title : input.starterCategory,
    );
  }

  if (isFitarritoHouseSalad(item)) {
    if (!input.saladType) return { error: "Choose a salad." };
    if (!input.protein) return { error: "Please select a protein." };

    const sizes = item.sizeVariants ?? [];

    if (sizes.length > 0 && !input.size) return { error: "Please select a size." };

    const selectedProtein = encodeSaladProteinSelection({
      saladType: input.saladType,
      protein: input.protein,
      toppings: input.toppings ?? [],
    });
    const pricing = calculateMenuItemPricing(item, selectedProtein, input.size);
    const summary = [
      input.saladType,
      input.size,
      input.protein,
      input.toppings?.length ? input.toppings.join(", ") : null,
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      selectedProtein,
      selectedSize: input.size || undefined,
      price: pricing.price,
      summary,
    };
  }

  const sizes = item.sizeVariants ?? [];

  if (sizes.length > 0 && !input.size) return { error: "Please select a size." };

  const proteins = getAvailableProteinVariants(item, input.size);

  if (proteins.length > 0 && !input.protein) return { error: "Please select a protein." };

  const pricing = calculateMenuItemPricing(
    item,
    input.protein,
    sizes.length > 0 ? input.size : null,
  );
  const summary = [input.size, input.protein].filter(Boolean).join(" · ");

  return {
    selectedProtein: input.protein || proteins[0]?.name || "Default",
    selectedSize: sizes.length > 0 ? input.size || undefined : undefined,
    price: pricing.price,
    summary: summary || item.title,
  };
}
