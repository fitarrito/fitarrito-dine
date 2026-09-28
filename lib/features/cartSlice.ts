import { createAsyncThunk, PayloadAction, createSlice } from "@reduxjs/toolkit";
import { fetchJson } from "@lib/apiFetch";
import type { CartSession } from "@lib/cartSession";
import type { EnrichedCartItem } from "@lib/cartItemsServer";
import { RootState } from "../store";

export type CartItem = EnrichedCartItem & {
  imageUrl?: string;
};

type AddToCartPayload = {
  sessionId: string;
  menuItemId: string;
  selectedProtein: string;
  selectedSize?: string;
  quantity?: number;
};

function normalizeCartItem(item: EnrichedCartItem): CartItem {
  return {
    ...item,
    imageUrl: item.image_url,
  };
}

function calculateTotals(items: CartItem[]) {
  return items.reduce(
    (total, item) => total + Number(item.price) * item.quantity,
    0,
  );
}

async function fetchCartFromApi({ sessionId }: CartSession) {
  const data = await fetchJson<EnrichedCartItem[]>(
    `/api/cart?session_id=${encodeURIComponent(sessionId)}`,
  );

  if (!Array.isArray(data)) {
    throw new Error("Invalid cart response");
  }

  return data.map(normalizeCartItem);
}

export const fetchCart = createAsyncThunk(
  "cart/fetchCart",
  async (session: CartSession, { rejectWithValue }) => {
    try {
      return await fetchCartFromApi(session);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch cart",
      );
    }
  },
);

export const updateCartQuantity = createAsyncThunk(
  "cart/updateQuantity",
  async (
    {
      id,
      quantity,
      session,
    }: {
      id: string;
      quantity: number;
      session: CartSession;
    },
    { rejectWithValue },
  ) => {
    try {
      await fetchJson<EnrichedCartItem>("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, quantity }),
      });

      return await fetchCartFromApi(session);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update cart item",
      );
    }
  },
);

export const removeCartItem = createAsyncThunk(
  "cart/removeCartItem",
  async (
    { id, session }: { id: string; session: CartSession },
    { rejectWithValue },
  ) => {
    try {
      await fetchJson(`/api/cart?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      return await fetchCartFromApi(session);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to remove cart item",
      );
    }
  },
);

export const addToCart = createAsyncThunk(
  "cart/addToCart",
  async (payload: AddToCartPayload, { rejectWithValue }) => {
    try {
      await fetchJson<{ success: boolean; message: string; item: EnrichedCartItem }>(
        "/api/cart",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: payload.sessionId,
            menuItemId: payload.menuItemId,
            selectedProtein: payload.selectedProtein,
            selectedSize: payload.selectedSize,
            quantity: payload.quantity ?? 1,
          }),
        },
      );

      return await fetchCartFromApi({ sessionId: payload.sessionId });
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to add to cart",
      );
    }
  },
);

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    cartItems: [] as CartItem[],
    totalAmt: 0,
    totalCartItems: 0,
    loading: "idle" as "idle" | "pending" | "succeeded" | "failed",
    error: null as string | null,
  },
  reducers: {
    clearCart: (state) => {
      state.cartItems = [];
      state.totalAmt = 0;
      state.totalCartItems = 0;
    },
  },
  extraReducers: (builder) => {
    const applyCartItems = (
      state: { cartItems: CartItem[]; totalAmt: number; totalCartItems: number },
      items: CartItem[],
    ) => {
      state.cartItems = items;
      state.totalAmt = calculateTotals(items);
      state.totalCartItems = items.reduce(
        (total, item) => total + item.quantity,
        0,
      );
    };

    builder
      .addCase(fetchCart.pending, (state) => {
        state.loading = "pending";
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action: PayloadAction<CartItem[]>) => {
        state.loading = "succeeded";
        applyCartItems(state, action.payload);
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = "failed";
        state.error =
          (action.payload as string | undefined) ?? "Failed to fetch cart";
      })
      .addCase(addToCart.pending, (state) => {
        state.loading = "pending";
        state.error = null;
      })
      .addCase(addToCart.fulfilled, (state, action: PayloadAction<CartItem[]>) => {
        state.loading = "succeeded";
        applyCartItems(state, action.payload);
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.loading = "failed";
        state.error =
          (action.payload as string | undefined) ?? "Failed to add to cart";
      })
      .addCase(updateCartQuantity.fulfilled, (state, action: PayloadAction<CartItem[]>) => {
        state.loading = "succeeded";
        applyCartItems(state, action.payload);
      })
      .addCase(removeCartItem.fulfilled, (state, action: PayloadAction<CartItem[]>) => {
        state.loading = "succeeded";
        applyCartItems(state, action.payload);
      });
  },
});

export const selectTotalQuantity = (state: RootState) =>
  state.cart.cartItems.reduce(
    (total, item) => total + (item.quantity ?? 0),
    0,
  );

export const { clearCart } = cartSlice.actions;
export default cartSlice.reducer;
