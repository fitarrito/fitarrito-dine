import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchCategory = createAsyncThunk('category/fetchCategory', async () => {
  const res = await fetch('/api/category');
  const data = await res.json();
  return data;
});

const menuSlice = createSlice({
  name: 'category',
  initialState: {
    items: [],
    loading: false,
    error: null as string | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategory.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchCategory.rejected, (state) => {
        state.loading = false;
        state.error = 'Failed to fetch menu';
      });
  },
});

export default menuSlice.reducer;