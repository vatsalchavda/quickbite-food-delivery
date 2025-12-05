import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { restaurantAPI } from '../services/api';

// Async thunks
export const fetchRestaurants = createAsyncThunk(
  'restaurants/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await restaurantAPI.getAll(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch restaurants');
    }
  }
);

export const fetchRestaurantById = createAsyncThunk(
  'restaurants/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await restaurantAPI.getById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch restaurant');
    }
  }
);

export const searchRestaurants = createAsyncThunk(
  'restaurants/search',
  async (query, { rejectWithValue }) => {
    try {
      const response = await restaurantAPI.search(query);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Search failed');
    }
  }
);

// Initial state
const initialState = {
  restaurants: [],
  selectedRestaurant: null,
  loading: false,
  error: null,
  searchResults: [],
  searchLoading: false,
};

// Slice
const restaurantSlice = createSlice({
  name: 'restaurants',
  initialState,
  reducers: {
    clearSelectedRestaurant: (state) => {
      state.selectedRestaurant = null;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all restaurants
      .addCase(fetchRestaurants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRestaurants.fulfilled, (state, action) => {
        state.loading = false;
        state.restaurants = action.payload.data || action.payload;
      })
      .addCase(fetchRestaurants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch restaurant by ID
      .addCase(fetchRestaurantById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRestaurantById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedRestaurant = action.payload.data || action.payload;
      })
      .addCase(fetchRestaurantById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Search restaurants
      .addCase(searchRestaurants.pending, (state) => {
        state.searchLoading = true;
      })
      .addCase(searchRestaurants.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload.data || action.payload;
      })
      .addCase(searchRestaurants.rejected, (state, action) => {
        state.searchLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSelectedRestaurant, clearSearchResults } = restaurantSlice.actions;
export default restaurantSlice.reducer;
