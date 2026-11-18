export function isBlockedMenuTitle(title?: string | null) {
  return /^\s*family\s+malatang\s*$/i.test(title ?? "");
}

export function isMenuItemAvailable(item: { is_available?: boolean | null }) {
  return item.is_available === true;
}

export function unavailableCartMessage(items: Array<{ title?: string | null }>) {
  const names = [
    ...new Set(
      items
        .map((item) => item.title?.trim())
        .filter((title): title is string => Boolean(title)),
    ),
  ];

  if (names.length === 0) {
    return "An item in your cart is temporarily unavailable. Please remove it from your cart to continue.";
  }

  if (names.length === 1) {
    return `${names[0]} is temporarily unavailable. Please remove it from your cart to continue.`;
  }

  const last = names[names.length - 1];
  const rest = names.slice(0, -1).join(", ");

  return `${rest} and ${last} are temporarily unavailable. Please remove them from your cart to continue.`;
}

export const FIXED_MENU_SELECTION = "Fixed";

export function isHiddenCartProtein(value?: string | null) {
  const name = value?.trim().toLowerCase();

  return !name || name === "fixed" || name === "default";
}
