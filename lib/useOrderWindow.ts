"use client";

import { useSyncExternalStore } from "react";
import {
  IGNORE_ORDER_CUTOFF_FOR_TESTING,
  getOrderWindow,
  type OrderWindow,
} from "./orderCutoff";

function subscribe(onStoreChange: () => void) {
  const intervalId = window.setInterval(onStoreChange, 15_000);
  window.addEventListener("focus", onStoreChange);

  return () => {
    window.clearInterval(intervalId);
    window.removeEventListener("focus", onStoreChange);
  };
}

function getServerSnapshot(): OrderWindow {
  return IGNORE_ORDER_CUTOFF_FOR_TESTING ? "dinner" : "closed";
}

export function useOrderWindow() {
  return useSyncExternalStore(subscribe, getOrderWindow, getServerSnapshot);
}
