export type MenuCuisineSlug = "mexican" | "pan-asian";

export const CUISINE_SLUG_TO_DB: Record<MenuCuisineSlug, string> = {
  mexican: "Mexican",
  "pan-asian": "Pan Asian",
};

export function cuisineSlugFromNavCategory(
  categoryId: string,
): MenuCuisineSlug | null {
  if (categoryId === "mexican" || categoryId === "pan-asian") {
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

  return null;
}
