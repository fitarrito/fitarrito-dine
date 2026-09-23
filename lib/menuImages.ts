import type { menuItem } from "@/types/types";

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

  const fallback = PAN_ASIAN_IMAGE_FALLBACKS[item.title.trim().toLowerCase()];

  return fallback ?? "/fallback-image.jpg";
}
