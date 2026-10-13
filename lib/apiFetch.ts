const DEFAULT_TIMEOUT_MS = 15_000;

function createTimeoutSignal(timeoutMs: number) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeoutMs);
  }

  const controller = new AbortController();
  globalThis.setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

function combineSignals(signals: AbortSignal[]) {
  const active = signals.filter(Boolean);

  if (active.length <= 1) return active[0];

  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any(active);
  }

  const controller = new AbortController();

  for (const signal of active) {
    if (signal.aborted) {
      controller.abort();
      break;
    }

    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  return controller.signal;
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);

  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-cache");
  if (!headers.has("Pragma")) headers.set("Pragma", "no-cache");

  const response = await fetch(input, {
    ...init,
    cache: init?.cache ?? "no-store",
    headers,
    signal: combineSignals(
      [init?.signal, createTimeoutSignal(DEFAULT_TIMEOUT_MS)].filter(
        (signal): signal is AbortSignal => Boolean(signal),
      ),
    ),
  });

  let data: unknown = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}
