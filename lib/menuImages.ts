import type { menuItem } from "@/types/types";

const PAN_ASIAN_IMAGE_FALLBACKS: Record<string, string> = {
  ramen: "/images/menuimages/ramen-bowl.png",
  "japanese ramen": "/images/menuimages/ramen-bowl.png",
  "mala xiang guo": "/images/menuimages/mala-xiang-guo.png",
  malatang: "/images/menuimages/malatang.jpg",
  laksa: "/images/menuimages/laksa-bowl.png",
  "tom yum noodle bowl": "/images/menuimages/tom-yum-noodle-bowl.jpg",
  "korean bibimbap": "/images/menuimages/korean-bibimbap.jpg",
  "thai green curry": "/images/menuimages/thai-green-curry.png",
};

export function resolveMenuItemImageUrl(item: Pick<menuItem, "title" | "imageUrl">) {
  if (item.imageUrl) {
    return item.imageUrl;
  }

  const normalizedTitle = item.title.trim().toLowerCase();
  const fallback = PAN_ASIAN_IMAGE_FALLBACKS[normalizedTitle];

  return fallback ?? "/fallback-image.jpg";
}

export function resolveProteinImageUrl(imageUrl?: string) {
  if (!imageUrl) return undefined;

  return imageUrl;
}
