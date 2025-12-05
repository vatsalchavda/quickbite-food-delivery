import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import restaurantReducer from './restaurantSlice';
import orderReducer from './orderSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    restaurants: restaurantReducer,
    orders: orderReducer,
  },
});

export default store;
