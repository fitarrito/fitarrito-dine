import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchJson } from "@lib/apiFetch";
import type { MenuCuisineSlug } from "@lib/menuCuisine";

type FoodCategory = {
  id: number;
  name: string;
};

type FetchCategoryArgs = {
  cuisine: MenuCuisineSlug;
};

export const fetchCategory = createAsyncThunk(
  "category/fetchCategory",
  async ({ cuisine }: FetchCategoryArgs, { rejectWithValue }) => {
    try {
      const data = await fetchJson<FoodCategory[]>(
        `/api/category?cuisine=${cuisine}`,
      );

      if (!Array.isArray(data)) {
        return rejectWithValue("Invalid category response");
      }

      return data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch categories",
      );
    }
  },
);

const categorySlice = createSlice({
  name: "category",
  initialState: {
    items: [] as FoodCategory[],
    loading: false,
    error: null as string | null,
    activeCuisine: null as MenuCuisineSlug | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.activeCuisine = action.meta.arg.cuisine;
      })
      .addCase(fetchCategory.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ??
          "Failed to fetch categories";
      });
  },
});

export default categorySlice.reducer;
