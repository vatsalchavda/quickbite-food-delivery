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
  image: {
    type: String,
    default: 'https://via.placeholder.com/300x200?text=Menu+Item',
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  dietary: {
    vegetarian: { type: Boolean, default: false },
    vegan: { type: Boolean, default: false },
    glutenFree: { type: Boolean, default: false },
    spicy: { type: Boolean, default: false },
  },
  preparationTime: {
    type: Number, // in minutes
    default: 15,
  },
});

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
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: {
          type: [Number],
          required: true
        }
      },
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
    },
    images: {
      logo: {
        type: String,
        default: 'https://via.placeholder.com/150x150?text=Logo',
      },
      cover: {
        type: String,
        default: 'https://via.placeholder.com/800x400?text=Restaurant',
      },
      gallery: [String],
    },
    menuItems: [menuItemSchema],
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
    priceRange: {
      type: String,
      enum: ['$', '$$', '$$$', '$$$$'],
      default: '$$',
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
    deliveryInfo: {
      available: {
        type: Boolean,
        default: true,
      },
      fee: {
        type: Number,
        default: 0,
      },
      minimumOrder: {
        type: Number,
        default: 0,
      },
      estimatedTime: {
        type: Number, // in minutes
        default: 30,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false, // Optional - would be required with restaurant owner authentication
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// COMPOUND TEXT INDEX for searching by name, description, and cuisine
restaurantSchema.index({ name: 'text', description: 'text', cuisineType: 'text' });

// GEOSPATIAL INDEX for location-based queries (find restaurants nearby)
restaurantSchema.index({ 'address.coordinates': '2dsphere' });

// Remove sensitive data from JSON response
restaurantSchema.methods.toJSON = function () {
  const restaurant = this.toObject();
  return restaurant;
};

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

module.exports = Restaurant;
