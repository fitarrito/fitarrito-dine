export type MenuCuisineSlug = "mexican" | "pan-asian" | "fitarrito-house";

export const CUISINE_SLUG_TO_DB: Record<MenuCuisineSlug, string> = {
  mexican: "Mexican",
  "pan-asian": "Pan Asian",
  "fitarrito-house": "Fitarrito House",
};

export function cuisineSlugFromNavCategory(
  categoryId: string,
): MenuCuisineSlug | null {
  if (
    categoryId === "mexican" ||
    categoryId === "pan-asian" ||
    categoryId === "fitarrito-house"
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

  return null;
}
