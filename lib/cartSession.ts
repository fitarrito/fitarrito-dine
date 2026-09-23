const SESSION_ID_KEY = "fitarrito_session_id";

export type CartSession = {
  sessionId: string;
};

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}`;
}

export function getCartSession(): CartSession {
  if (typeof window === "undefined") {
    return { sessionId: "session-1" };
  }

  let sessionId = window.localStorage.getItem(SESSION_ID_KEY);

  if (!sessionId) {
    sessionId = createSessionId();
    window.localStorage.setItem(SESSION_ID_KEY, sessionId);
  }

  return { sessionId };
}

export function resetCartSession() {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(SESSION_ID_KEY, createSessionId());
}
