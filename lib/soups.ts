export const SOUPS_CATEGORY_NAME = "Soups";

const SOUP_SELECTION = "Soups: Fixed";

export function isSoupsCategoryName(name?: string | null) {
  return name?.trim().toLowerCase() === SOUPS_CATEGORY_NAME.toLowerCase();
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
