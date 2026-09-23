import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchJson } from "@lib/apiFetch";
import type { MenuCuisineSlug } from "@lib/menuCuisine";
import type { menuItem } from "@/types/types";

function withoutMuttonProtein(items: menuItem[]) {
  return items.map((item) => ({
    ...item,
    proteinVariants: item.proteinVariants?.filter(
      (protein) => protein.name.toLowerCase() !== "mutton",
    ),
  }));
}

type FetchMenuArgs = {
  cuisine: MenuCuisineSlug;
};

export const fetchMenu = createAsyncThunk(
  "menu/fetchMenu",
  async ({ cuisine }: FetchMenuArgs, { rejectWithValue }) => {
    try {
      const data = await fetchJson<menuItem[]>(`/api/menu?cuisine=${cuisine}`);

      if (!Array.isArray(data)) {
        return rejectWithValue("Invalid menu response");
      }

      return withoutMuttonProtein(data);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch menu",
      );
    }
  },
);

const menuSlice = createSlice({
  name: "menu",
  initialState: {
    items: [] as menuItem[],
    loading: false,
    error: null as string | null,
    activeCuisine: null as MenuCuisineSlug | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMenu.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMenu.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.activeCuisine = action.meta.arg.cuisine;
      })
      .addCase(fetchMenu.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string | undefined) ?? "Failed to fetch menu";
      });
  },
});

export default menuSlice.reducer;
