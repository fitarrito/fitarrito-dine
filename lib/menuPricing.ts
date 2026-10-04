import type { menuItem, ProteinVariant, SizeVariant } from "@/types/types";
import { getProteinNameForPricing } from "@lib/fitarritoHouseMenu";
import { quoteSizePrice } from "@lib/mexicanMiniOffer";

export function findSizeVariant(
  menuItemRow: menuItem,
  selectedSize?: string | null,
): SizeVariant | undefined {
  if (!selectedSize || !menuItemRow.sizeVariants?.length) {
    return undefined;
  }

  return menuItemRow.sizeVariants.find(
    (size) => size.name.toLowerCase() === selectedSize.toLowerCase(),
  );
}

export function getAvailableProteinVariants(
  item: Pick<menuItem, "proteinVariants">,
  selectedSize?: string | null,
): ProteinVariant[] {
  const isMini = selectedSize?.trim().toLowerCase() === "mini";

  return (
    item.proteinVariants?.filter((protein) => {
      const name = protein.name.trim().toLowerCase();

      if (name === "mutton") return false;
      if (isMini && name === "prawn") return false;

      return true;
    }) ?? []
  );
}

export function findProteinVariant(
  menuItemRow: menuItem,
  selectedProtein?: string | null,
): ProteinVariant | undefined {
  if (!selectedProtein) return undefined;

  const proteinName = getProteinNameForPricing(selectedProtein);

  if (!proteinName) return undefined;

  return menuItemRow.proteinVariants?.find(
    (protein) =>
      protein.name.toLowerCase() === proteinName.toLowerCase() &&
      protein.name.toLowerCase() !== "mutton",
  );
}

export function calculateMenuItemPricing(
  menuItemRow: menuItem,
  selectedProtein?: string | null,
  selectedSize?: string | null,
  now: Date = new Date(),
) {
  const sizeVariant = findSizeVariant(menuItemRow, selectedSize);
  const listPrice = parseFloat(String(menuItemRow.price || 0));
  const quote = quoteSizePrice(menuItemRow, sizeVariant, listPrice, now);
  const basePrice = quote.price;
  const proteinVariant = findProteinVariant(menuItemRow, selectedProtein);
  const proteinPrice = parseFloat(String(proteinVariant?.price || 0));
  const originalPrice =
    quote.originalPrice == null ? null : quote.originalPrice + proteinPrice;

  return {
    base_price: basePrice,
    protein_price: proteinPrice,
    price: basePrice + proteinPrice,
    original_price: originalPrice,
  };
}
