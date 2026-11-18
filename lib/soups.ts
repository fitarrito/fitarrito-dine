export const SOUPS_CATEGORY_NAME = "Soups & Bowls";

const SOUP_CATEGORY_NAMES = new Set(["soups", "soups and bowls"]);

const SOUP_SELECTION = "Soups: Fixed";

const SOUPS_AND_BOWLS_ORDER = [
  "Japanese Ramen",
  "Laksa",
  "Tom Yum Soup",
  "Vietnamese Pho Soup",
  "Talumein Soup",
  "Fitarrito Special Soup",
  "Miso Soup",
];

export function isSoupsCategoryName(name?: string | null) {
  const normalized = name?.trim().toLowerCase().replace("&", "and").replace(/\s+/g, " ");

  return normalized != null && SOUP_CATEGORY_NAMES.has(normalized);
}

export function sortSoupsAndBowls<T extends { title: string }>(items: T[]) {
  return items.slice().sort((left, right) => {
    const leftIndex = SOUPS_AND_BOWLS_ORDER.indexOf(left.title);
    const rightIndex = SOUPS_AND_BOWLS_ORDER.indexOf(right.title);

    return (leftIndex === -1 ? SOUPS_AND_BOWLS_ORDER.length : leftIndex) -
      (rightIndex === -1 ? SOUPS_AND_BOWLS_ORDER.length : rightIndex);
  });
}

export function encodeSoupSelection() {
  return SOUP_SELECTION;
}

export function decodeSoupSelection(value?: string | null) {
  return value?.trim() === SOUP_SELECTION ? { fixed: true as const } : null;
}

export function quoteSoupSelection(price: unknown, selection?: string | null) {
  if (!decodeSoupSelection(selection)) {
    return { error: "This soup has a fixed price." };
  }

  const amount = Number(price);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "This soup is not available at the menu price." };
  }

  const unitPrice = Math.round(amount);

  return {
    base_price: unitPrice,
    protein_price: 0,
    price: unitPrice,
    selection: SOUP_SELECTION,
  };
}
