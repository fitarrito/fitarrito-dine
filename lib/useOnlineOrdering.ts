"use client";

import { useSyncExternalStore } from "react";

export type OnlineOrderingSnapshot = {
  enabled: boolean | null;
  checked: boolean;
};

const SERVER_SNAPSHOT: OnlineOrderingSnapshot = {
  enabled: null,
  checked: false,
};

let current: OnlineOrderingSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();
let pollId = 0;
let refreshInFlight = false;

function emit(next: OnlineOrderingSnapshot) {
  if (next.enabled === current.enabled && next.checked === current.checked) return;

  current = next;
  listeners.forEach((listener) => listener());
}

async function refreshOnlineOrdering() {
  if (refreshInFlight) return;

  refreshInFlight = true;

  try {
    const response = await fetch("/api/ordering-status", { cache: "no-store" });

    if (!response.ok) {
      emit({ ...current, checked: true });
      return;
    }

    const data = (await response.json()) as { onlineOrderingEnabled?: unknown };

    if (typeof data.onlineOrderingEnabled !== "boolean") {
      emit({ ...current, checked: true });
      return;
    }

    emit({ enabled: data.onlineOrderingEnabled, checked: true });
  } catch {
    emit({ ...current, checked: true });
  } finally {
    refreshInFlight = false;
  }
}

function onFocus() {
  void refreshOnlineOrdering();
}

function onVisibility() {
  if (document.visibilityState === "visible") void refreshOnlineOrdering();
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  if (listeners.size === 1) {
    void refreshOnlineOrdering();
    pollId = window.setInterval(() => {
      void refreshOnlineOrdering();
    }, 8000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size > 0) return;

    window.clearInterval(pollId);
    pollId = 0;
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

function getSnapshot() {
  return current;
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

export function useOnlineOrdering() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function orderingActionsPaused(onlineOrderingEnabled: boolean | null) {
  return onlineOrderingEnabled === false;
}
