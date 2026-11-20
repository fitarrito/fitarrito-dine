export type AlertOrder = {
  id: string | number;
  status: string;
};

export function pendingAlertIds(
  orders: AlertOrder[],
  baselineIds: ReadonlySet<string> | null,
) {
  if (!baselineIds) return [];

  const ids: string[] = [];
  const seen = new Set<string>();

  for (const order of orders) {
    const id = String(order.id);

    if (seen.has(id) || order.status !== "pending" || baselineIds.has(id)) {
      seen.add(id);
      continue;
    }

    seen.add(id);
    ids.push(id);
  }

  return ids.sort();
}

export function formatStaffOrderPlacedAt(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h12",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const day = read("day");
  const month = read("month");
  const year = read("year");
  const hour = read("hour");
  const minute = read("minute");
  const dayPeriod = read("dayPeriod").replace(/\./g, "").toUpperCase();

  if (!day || !month || !year || !hour || !minute || !dayPeriod) return null;

  return `${day} ${month} ${year} · ${hour}:${minute} ${dayPeriod}`;
}
