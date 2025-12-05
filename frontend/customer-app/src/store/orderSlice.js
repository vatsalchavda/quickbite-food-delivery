import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { orderAPI } from '../services/api';

// Async thunks
export const createOrder = createAsyncThunk(
  'orders/create',
  async (orderData, { rejectWithValue }) => {
    try {
      const response = await orderAPI.create(orderData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create order');
    }
  }
);

export const fetchMyOrders = createAsyncThunk(
  'orders/fetchMyOrders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await orderAPI.getMyOrders();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch orders');
    }
  }
);

export const fetchOrderById = createAsyncThunk(
  'orders/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await orderAPI.getById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch order');
    }
  }
);

// Initial state
const initialState = {
  orders: [],
  currentOrder: null,
  cart: [],
  loading: false,
  error: null,
};

// Slice
const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const item = action.payload;
      const existingItem = state.cart.find((i) => i._id === item._id);
      
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.cart.push({ ...item, quantity: 1 });
      }
    },
    removeFromCart: (state, action) => {
      state.cart = state.cart.filter((item) => item._id !== action.payload);
    },
    updateQuantity: (state, action) => {
      const { itemId, quantity } = action.payload;
      const item = state.cart.find((i) => i._id === itemId);
      if (item) {
        item.quantity = quantity;
      }
    },
    clearCart: (state) => {
      state.cart = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create order
      .addCase(createOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = action.payload.data || action.payload;
        state.cart = [];
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch my orders
      .addCase(fetchMyOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload.data || action.payload;
      })
      .addCase(fetchMyOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch order by ID
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.currentOrder = action.payload.data || action.payload;
      });
  },
});

export const { addToCart, removeFromCart, updateQuantity, clearCart, clearError } = orderSlice.actions;
export default orderSlice.reducer;
