import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchMenu = createAsyncThunk('menu/fetchMenu', async () => {
  const res = await fetch('/api/menu');
  const data = await res.json();
  return data;
});

const menuSlice = createSlice({
  name: 'menu',
  initialState: {
    items: [],
    loading: false,
    error: null as string | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMenu.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMenu.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchMenu.rejected, (state) => {
        state.loading = false;
        state.error = 'Failed to fetch menu';
      });
  },
});

export default menuSlice.reducer;