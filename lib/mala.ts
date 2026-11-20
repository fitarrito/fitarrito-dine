export function isMalaCategoryName(name?: string | null) {
  return name?.trim().toLowerCase().replace(/\s+/g, " ") === "mala";
}

const MALA_TITLE_ORDER = ["Mala Xiang Guo", "Malatang", "Malatang Bowl"];

export function sortMalaDishes<T extends { title: string }>(items: T[]) {
  return items.slice().sort((left, right) => {
    const leftIndex = MALA_TITLE_ORDER.indexOf(left.title);
    const rightIndex = MALA_TITLE_ORDER.indexOf(right.title);

    return (leftIndex === -1 ? MALA_TITLE_ORDER.length : leftIndex) -
      (rightIndex === -1 ? MALA_TITLE_ORDER.length : rightIndex);
  });
}
