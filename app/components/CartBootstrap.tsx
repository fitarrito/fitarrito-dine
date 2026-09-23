"use client";

import { useEffect } from "react";
import { fetchCart } from "@lib/features/cartSlice";
import { getCartSession } from "@lib/cartSession";
import { useAppDispatch } from "@lib/hooks";

export default function CartBootstrap() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchCart(getCartSession()));
  }, [dispatch]);

  return null;
}
