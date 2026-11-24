const SIZE_PREFIX = "__size:";

export function packWaiterSelection(protein: string, size?: string | null) {
  const cleanSize = size?.trim();

  if (!cleanSize) return protein;

  return `${SIZE_PREFIX}${cleanSize}__${protein}`;
}

export function unpackWaiterSelection(value?: string | null) {
  const raw = value ?? "";
  const match = new RegExp(`^${SIZE_PREFIX}(.+?)__(.*)$`).exec(raw);

  if (!match) {
    return {
      selectedSize: null as string | null,
      selectedProtein: raw || null,
    };
  }

  return {
    selectedSize: match[1] || null,
    selectedProtein: match[2] || null,
  };
}
