import type { menuItem, ProteinVariant, SizeVariant } from "@/types/types";
import { getProteinNameForPricing } from "@lib/fitarritoHouseMenu";

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
) {
  const sizeVariant = findSizeVariant(menuItemRow, selectedSize);
  const basePrice = sizeVariant
    ? parseFloat(String(sizeVariant.price || 0))
    : parseFloat(String(menuItemRow.price || 0));
  const proteinVariant = findProteinVariant(menuItemRow, selectedProtein);
  const proteinPrice = parseFloat(String(proteinVariant?.price || 0));

  return {
    base_price: basePrice,
    protein_price: proteinPrice,
    price: basePrice + proteinPrice,
  };
}
