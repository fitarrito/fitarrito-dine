"use client";

import { Provider } from "react-redux";
import { store } from "@lib/store";
import CartBootstrap from "./components/CartBootstrap";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <CartBootstrap />
      {children}
    </Provider>
  );
}
