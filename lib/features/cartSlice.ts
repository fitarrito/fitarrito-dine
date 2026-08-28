import { createAsyncThunk, PayloadAction, createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { menuItem } from "@/types/types";
type AddToCartPayload = {
  id?:string,
  table_id: string;
  session_id: string;
  imageUrl:string;
  menu_item_id: string; // or string, match DB
  title: string;
  image_url?: string;
  price: number;
  quantity: number;
  selected_protein?: string | null;
  selected_size?: "regular" | "jumbo";
};
interface Id{
  table_id:string,
  session_id:string
}
export const updateCartQuantity = createAsyncThunk(
  "cart/updateQuantity",
  async ({
    id,
    quantity,
  }: {
    id: string;
    quantity: number;
  }) => {
    const res = await fetch("/api/cart", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        quantity,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }
);
export const removeCartItem = createAsyncThunk(
  "cart/removeCartItem",
  async (id: string) => {
    const res = await fetch(`/api/cart?id=${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    return id;
  }
);
export const fetchCart = createAsyncThunk(
  "cart/fetchCart",
  async ({ table_id, session_id }: Id) => {
    const res = await fetch(
      `/api/cart?table_id=${table_id}&session_id=${session_id}`
    );

    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    return data;
  }
);
export const addToCart = createAsyncThunk(
  "cart/addToCart",
  async (payload: AddToCartPayload) => {
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    return data;
  }
);

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    cartItems: [] as AddToCartPayload[],
    totalAmt: 0,
    totalCartItems:0,
    loading: "idle",
  },
  reducers: {
    clearCart: (state) => {
      state.cartItems = [];
      state.totalAmt = 0;
    },

  },
  extraReducers: (builder) => {
    builder
      // FETCH CART
      .addCase(fetchCart.pending, (state) => {
        state.loading = "pending";
      })
      .addCase(
        fetchCart.fulfilled,
        (state, action: PayloadAction<AddToCartPayload[]>) => {
          state.loading = "succeeded";
  
          state.cartItems = action.payload;
  
          state.totalAmt = action.payload.reduce(
            (total, item) =>
              total + Number(item.price) * item.quantity,
            0
          );
        }
      )
      .addCase(fetchCart.rejected, (state) => {
        state.loading = "failed";
      })
  
      // ADD TO CART
      .addCase(addToCart.pending, (state) => {
        state.loading = "pending";
      })
      .addCase(
        addToCart.fulfilled,
        (state, action: PayloadAction<AddToCartPayload[]>) => {
          state.loading = "succeeded";
  
          const returnedItem = Array.isArray(action.payload)
            ? action.payload[0]
            : action.payload;
  
          const existingItem = state.cartItems.find(
            (item) => item.id === returnedItem.id
          );
  
          if (existingItem) {
            existingItem.quantity = returnedItem.quantity;
          } else {
            state.cartItems.push(returnedItem);
            state.totalCartItems=state.cartItems.length
          }
  
          state.totalAmt = state.cartItems.reduce(
            (total, item) =>
              total + Number(item.price) * item.quantity,
            0
          );
        }
      )
      .addCase(addToCart.rejected, (state) => {
        state.loading = "failed";
      })
      .addCase(removeCartItem.fulfilled, (state, action) => {
        state.cartItems = state.cartItems.filter(
          (item) => item.id !== action.payload
        );
      
        state.totalAmt = state.cartItems.reduce(
          (total, item) =>
            total + Number(item.price) * item.quantity,
          0
        );
        state.totalCartItems=state.cartItems.length

      })
      .addCase(updateCartQuantity.fulfilled, (state, action) => {
        const updatedItem = action.payload;
      
        const existingItem = state.cartItems.find(
          (item) => item.id === updatedItem.id
        );
      
        if (existingItem) {
          existingItem.quantity = updatedItem.quantity;
        }
      
        state.totalAmt = state.cartItems.reduce(
          (total, item) =>
            total + Number(item.price) * item.quantity,
          0
        );
      });
  }
});
export const selectTotalQuantity = (state: RootState) =>
  state.cart.cartItems?.reduce(
    (total: number, item: AddToCartPayload) => total + (item.quantity ?? 0),
    0
  ) || 0;
export const { clearCart } =
  cartSlice.actions;
export default cartSlice.reducer;
