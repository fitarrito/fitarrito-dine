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
  "vietnamese rice paper roll": "/images/menuimages/vietnamese-rice-paper-roll.jpg",
  "salt & pepper": "/images/menuimages/salt-and-pepper.jpg",
  "chilli basil": "/images/menuimages/chilli-basil.jpg",
  "shanghai crispy": "/images/menuimages/shanghai-crispy.jpg",
  "mongolian gravy": "/images/menuimages/mongolian-gravy.jpg",
  "stir fry gravy": "/images/menuimages/stir-fry-gravy.jpg",
  "thai red curry": "/images/menuimages/thai-red-curry.jpg",
  "mango sticky rice": "/images/menuimages/mango-sticky-rice.jpg",
  "wanton dates": "/images/menuimages/wanton-dates.jpg",
  "water chestnut": "/images/menuimages/water-chestnut.jpg",
  "vietnamese pho soup": "/images/menuimages/vietnamese-pho-soup.jpg",
  "talumein soup": "/images/menuimages/talumein-soup.jpg",
  "fitarrito special soup": "/images/menuimages/fitarrito-special-soup.jpg",
  "tom yum soup": "/images/menuimages/tom-yum-soup.jpg",
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
