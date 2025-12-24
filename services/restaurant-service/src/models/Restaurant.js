const mongoose = require('mongoose');

// Sub-schema for menu items
const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Menu item name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  category: {
    type: String,
    enum: ['appetizer', 'main', 'dessert', 'beverage', 'side'],
    required: true,
  },
  imageUrl: {
    type: String,
    default: 'https://via.placeholder.com/300x200?text=Menu+Item',
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  dietaryInfo: [String],
}, { timestamps: true });

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
      index: 'text', // TEXT INDEX for full-text search
    },
    description: {
      type: String,
      trim: true,
      index: 'text',
    },
    cuisineType: {
      type: String,
      required: [true, 'Cuisine type is required'],
      index: true,
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, default: 'USA' },
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      index: true,
      lowercase: true
    },
    ownerId: {
      type: String,
      index: true
    },
    openingHours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String },
    },
    menu: [menuItemSchema],
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for better query performance
restaurantSchema.index({ cuisineType: 1 });
restaurantSchema.index({ 'address.city': 1 });
restaurantSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Restaurant', restaurantSchema);
