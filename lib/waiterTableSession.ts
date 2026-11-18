const TABLE_SESSIONS_KEY = "fitarrito_waiter_table_sessions";

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // Insecure contexts can throw.
    }
  }

  return `waiter-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readSessions(): Record<string, string> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(TABLE_SESSIONS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};

    if (!parsed || typeof parsed !== "object") return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === "string" && typeof entry[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

function writeSessions(sessions: Record<string, string>) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(TABLE_SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // Safari private mode can block localStorage.
  }
}

const TABLE_NOTES_KEY = "fitarrito_waiter_table_notes";
const SUBMITTED_ORDERS_KEY = "fitarrito_waiter_submitted_orders";

export type WaiterSubmittedLine = {
  title: string;
  detail: string;
  quantity: number;
  price: number;
};

export type WaiterSubmittedOrder = {
  id: string;
  table: string;
  notes: string;
  lines: WaiterSubmittedLine[];
  total: number;
  submittedAt: string;
};

function readNotes(): Record<string, string> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(TABLE_NOTES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};

    if (!parsed || typeof parsed !== "object") return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === "string" && typeof entry[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

export function readWaiterTableNotes(table: string) {
  return readNotes()[table] ?? "";
}

export function writeWaiterTableNotes(table: string, notes: string) {
  if (typeof window === "undefined") return;

  const stored = readNotes();

  if (notes.trim()) stored[table] = notes;
  else delete stored[table];

  try {
    window.localStorage.setItem(TABLE_NOTES_KEY, JSON.stringify(stored));
  } catch {
    // Safari private mode can block localStorage.
  }
}

export function readWaiterSubmittedOrders(): WaiterSubmittedOrder[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(SUBMITTED_ORDERS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];

    return Array.isArray(parsed) ? (parsed as WaiterSubmittedOrder[]) : [];
  } catch {
    return [];
  }
}

export function saveWaiterSubmittedOrder(order: WaiterSubmittedOrder) {
  if (typeof window === "undefined") return;

  const orders = [order, ...readWaiterSubmittedOrders()];

  try {
    window.localStorage.setItem(SUBMITTED_ORDERS_KEY, JSON.stringify(orders));
  } catch {
    // Safari private mode can block localStorage.
  }
}

/** A cart session that belongs only to this waiter table, separate from the customer cart. */
export function getWaiterTableSessionId(table: string) {
  const sessions = readSessions();
  const existing = sessions[table];

  if (existing) return existing;

  const sessionId = createSessionId();
  sessions[table] = sessionId;
  writeSessions(sessions);
  return sessionId;
}
