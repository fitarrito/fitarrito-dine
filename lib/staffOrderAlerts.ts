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
