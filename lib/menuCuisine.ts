export type MenuCuisineSlug =
  | "mexican"
  | "pan-asian"
  | "fitarrito-house"
  | "asian-starters-gravy";

export const CUISINE_SLUG_TO_DB: Record<MenuCuisineSlug, string> = {
  mexican: "Mexican",
  "pan-asian": "Pan Asian",
  "fitarrito-house": "Fitarrito House",
  "asian-starters-gravy": "Asian Starters & Gravy",
};

export function cuisineSlugFromNavCategory(
  categoryId: string,
): MenuCuisineSlug | null {
  if (categoryId === "desserts" || categoryId === "soups") return "pan-asian";

  if (
    categoryId === "mexican" ||
    categoryId === "pan-asian" ||
    categoryId === "fitarrito-house" ||
    categoryId === "asian-starters-gravy"
  ) {
    return categoryId;
  }

  return null;
}

export function dbCuisineFromSlug(slug: MenuCuisineSlug): string {
  return CUISINE_SLUG_TO_DB[slug];
}

export function normalizeCuisineQuery(value: string | null): string | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();

  if (normalized === "mexican") return CUISINE_SLUG_TO_DB.mexican;
  if (normalized === "pan-asian" || normalized === "pan asian") {
    return CUISINE_SLUG_TO_DB["pan-asian"];
  }

  if (normalized === "fitarrito-house" || normalized === "fitarrito house") {
    return CUISINE_SLUG_TO_DB["fitarrito-house"];
  }

  if (
    normalized === "asian-starters-gravy" ||
    normalized === "asian starters & gravy" ||
    normalized === "asian starters and gravy"
  ) {
    return CUISINE_SLUG_TO_DB["asian-starters-gravy"];
  }

  return null;
}
