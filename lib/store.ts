import { configureStore } from '@reduxjs/toolkit';
import menuReducer from './features/menuSlice';
import categoryReducer from './features/categorySlice';
import cartReducer from "./features/cartSlice"
export const store = configureStore({
  reducer: {
    menu: menuReducer,
    category: categoryReducer,
    cart:cartReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;