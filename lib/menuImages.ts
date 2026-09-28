import type { menuItem } from "@/types/types";

import {
  FITARRITO_HOUSE_IMAGE_FALLBACKS,
} from "@lib/fitarritoHouseMenu";

const PAN_ASIAN_IMAGE_FALLBACKS: Record<string, string> = {
  ramen: "/images/menuimages/ramen-bowl.png",
  "mala xiang guo": "/images/menuimages/mala-xiang-guo.png",
  laksa: "/images/menuimages/laksa-bowl.png",
  "thai green curry": "/images/menuimages/thai-green-curry.png",
};

export function resolveMenuItemImageUrl(item: Pick<menuItem, "title" | "imageUrl">) {
  if (item.imageUrl) {
    return item.imageUrl;
  }

  const normalizedTitle = item.title.trim().toLowerCase();
  const fallback =
    PAN_ASIAN_IMAGE_FALLBACKS[normalizedTitle] ??
    FITARRITO_HOUSE_IMAGE_FALLBACKS[normalizedTitle];

  return fallback ?? "/fallback-image.jpg";
}

const PROTEIN_IMAGE_FALLBACKS: Record<string, string> = {
  "/images/menuimages/proteinImages/TofuIcon.svg":
    "/images/menuimages/proteinImages/TofuIcon.png",
  "/images/menuimages/proteinImages/PrawnIcon.svg":
    "/images/menuimages/proteinImages/PrawnIcon.png",
};

export function resolveProteinImageUrl(imageUrl?: string) {
  if (!imageUrl) return undefined;

  return PROTEIN_IMAGE_FALLBACKS[imageUrl] ?? imageUrl;
}
