export function readFormatOptions(value: unknown) {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const options: string[] = [];

  for (const entry of value) {
    if (typeof entry !== "string") continue;

    const option = entry.trim();
    const key = option.toLowerCase();

    if (!option || seen.has(key)) continue;

    seen.add(key);
    options.push(option);
  }

  return options;
}

export function formatChoicePrompt(options: string[]) {
  const names = new Set(options.map((option) => option.toLowerCase()));

  if (options.length === 2 && names.has("noodles") && names.has("rice")) {
    return "Choose Noodles or Rice.";
  }

  return "Choose your base.";
}

export function resolveItemFormat(
  options: string[],
  submitted: unknown,
): { itemFormat: string | null } | { error: string } {
  if (options.length === 0) return { itemFormat: null };

  if (options.length === 1) return { itemFormat: options[0] };

  const value = typeof submitted === "string" ? submitted.trim() : "";
  const match = options.find((option) => option.toLowerCase() === value.toLowerCase());

  if (!match) return { error: formatChoicePrompt(options) };

  return { itemFormat: match };
}
