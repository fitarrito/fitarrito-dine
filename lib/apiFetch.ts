const DEFAULT_TIMEOUT_MS = 15_000;

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });

  const data = await response.json();

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
