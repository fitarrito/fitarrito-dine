import type { menuItem, SizeVariant } from "@/types/types";

/** Chargeable Mini price during the launching offer. */
export const MEXICAN_MINI_OFFER_PRICE = 99;

/**
 * Catalog Mini price when the stored size price has been replaced by the offer.
 * Menu rows still keep this on `price`.
 */
export const MEXICAN_MINI_CATALOG_PRICE = 199;

export const MEXICAN_MINI_OFFER_START = "2026-10-05";
export const MEXICAN_MINI_OFFER_END = "2026-10-07";
export const MEXICAN_MINI_OFFER_TIME_ZONE = "Asia/Kolkata";
export const MEXICAN_MINI_OFFER_RANGE_LABEL = "5–7 Oct 2026";

export type SizePriceQuote = {
  price: number;
  originalPrice: number | null;
};

function parseAmount(value: number | string | null | undefined) {
  const amount = parseFloat(String(value ?? 0));
  return Number.isFinite(amount) ? amount : 0;
}

export function kolkataCalendarDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MEXICAN_MINI_OFFER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isMexicanMiniOfferActive(now: Date = new Date()) {
  const day = kolkataCalendarDate(now);
  return day >= MEXICAN_MINI_OFFER_START && day <= MEXICAN_MINI_OFFER_END;
}

function isMexicanCuisine(cuisine?: string | null) {
  return cuisine?.trim().toLowerCase() === "mexican";
}

function isMiniSize(name?: string | null) {
  return name?.trim().toLowerCase() === "mini";
}

/** Normal Mini price. Prefers a stored size price above the offer, then the item list price. */
export function mexicanMiniCatalogPrice(
  item: Pick<menuItem, "price">,
  storedSizePrice: number,
) {
  if (storedSizePrice > MEXICAN_MINI_OFFER_PRICE) return storedSizePrice;

  const listPrice = parseAmount(item.price);
  if (listPrice > MEXICAN_MINI_OFFER_PRICE) return listPrice;

  return MEXICAN_MINI_CATALOG_PRICE;
}

export function quoteSizePrice(
  item: Pick<menuItem, "cuisine" | "price">,
  size: Pick<SizeVariant, "name" | "price"> | undefined,
  fallbackPrice: number,
  now: Date = new Date(),
): SizePriceQuote {
  if (!size) {
    return { price: fallbackPrice, originalPrice: null };
  }

  const stored = parseAmount(size.price);

  if (!isMexicanCuisine(item.cuisine) || !isMiniSize(size.name)) {
    return { price: stored, originalPrice: null };
  }

  const catalog = mexicanMiniCatalogPrice(item, stored);

  if (!isMexicanMiniOfferActive(now)) {
    return { price: catalog, originalPrice: null };
  }

  return {
    price: MEXICAN_MINI_OFFER_PRICE,
    originalPrice: catalog > MEXICAN_MINI_OFFER_PRICE ? catalog : null,
  };
}
