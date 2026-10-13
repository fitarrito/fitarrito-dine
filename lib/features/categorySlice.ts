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
  async ({ cuisine }: FetchCategoryArgs, { rejectWithValue, signal }) => {
    try {
      const data = await fetchJson<FoodCategory[]>(
        `/api/category?cuisine=${cuisine}`,
        { signal },
      );

      if (!Array.isArray(data)) {
        return rejectWithValue("Invalid category response");
      }

      return data;
    } catch (error) {
      if (signal.aborted) return rejectWithValue("aborted");

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
    requestId: null as string | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategory.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.requestId = action.meta.requestId;
      })
      .addCase(fetchCategory.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;

        state.loading = false;
        state.items = action.payload;
        state.activeCuisine = action.meta.arg.cuisine;
      })
      .addCase(fetchCategory.rejected, (state, action) => {
        if (
          state.requestId !== action.meta.requestId ||
          action.meta.aborted ||
          action.payload === "aborted"
        ) {
          return;
        }

        state.loading = false;
        state.activeCuisine = action.meta.arg.cuisine;
        state.error =
          (action.payload as string | undefined) ??
          "Failed to fetch categories";
      });
  },
});

export default categorySlice.reducer;
