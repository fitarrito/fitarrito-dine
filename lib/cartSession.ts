const SESSION_ID_KEY = "fitarrito_session_id";

export type CartSession = {
  sessionId: string;
};

let memorySessionId: string | null = null;

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // Insecure contexts (http://LAN-ip) can throw.
    }
  }

  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readStoredSession() {
  if (typeof window === "undefined") return null;

  try {
    return (
      window.localStorage.getItem(SESSION_ID_KEY) ??
      window.sessionStorage.getItem(SESSION_ID_KEY)
    );
  } catch {
    return null;
  }
}

function writeStoredSession(sessionId: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(SESSION_ID_KEY, sessionId);
  } catch {
    // Safari private mode can block localStorage.
  }

  try {
    window.sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  } catch {
    // Ignore if sessionStorage is also unavailable.
  }
}

export function getCartSession(): CartSession {
  if (typeof window === "undefined") {
    return { sessionId: "session-1" };
  }

  const existing = readStoredSession() ?? memorySessionId;

  if (existing) {
    memorySessionId = existing;
    writeStoredSession(existing);
    return { sessionId: existing };
  }

  const sessionId = createSessionId();
  memorySessionId = sessionId;
  writeStoredSession(sessionId);
  return { sessionId };
}

export function resetCartSession() {
  memorySessionId = createSessionId();
  writeStoredSession(memorySessionId);
}
