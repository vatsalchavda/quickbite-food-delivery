const mongoose = require('mongoose');

/**
 * Driver Schema with Geospatial Location Tracking
 * 
 * Key Concepts:
 * - GeoJSON Point for location (required for MongoDB geospatial queries)
 * - 2dsphere index for $near, $geoWithin queries
 * - Status tracking (available, busy, offline)
 * - Vehicle information for delivery assignments
 */

const driverSchema = new mongoose.Schema({
  // Personal Information
  name: {
    type: String,
    required: [true, 'Driver name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true
  },
  
  // Current Location - GeoJSON format for geospatial queries
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && // longitude
                 coords[1] >= -90 && coords[1] <= 90;     // latitude
        },
        message: 'Invalid coordinates. Format: [longitude, latitude]'
      }
    }
  },
  
  // Location History for tracking and analytics
  locationHistory: [{
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number]
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Driver Status
  status: {
    type: String,
    enum: ['available', 'busy', 'offline'],
    default: 'offline',
    index: true
  },
  
  // Vehicle Information
  vehicle: {
    type: {
      type: String,
      enum: ['bike', 'scooter', 'car', 'bicycle'],
      required: true
    },
    licensePlate: {
      type: String,
      required: true,
      uppercase: true
    },
    color: String,
    make: String,
    model: String
  },
  
  // Current Delivery Assignment
  currentOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  
  // Performance Metrics
  metrics: {
    totalDeliveries: {
      type: Number,
      default: 0
    },
    rating: {
      average: {
        type: Number,
        default: 5.0,
        min: 0,
        max: 5
      },
      count: {
        type: Number,
        default: 0
      }
    },
    onTimeDeliveryRate: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    }
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Timestamps
  lastLocationUpdate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Geospatial Index - CRITICAL for location-based queries
// Enables $near, $geoWithin, $geoIntersects queries
driverSchema.index({ currentLocation: '2dsphere' });

// Compound index for finding available drivers nearby
driverSchema.index({ status: 1, currentLocation: '2dsphere' });

/**
 * Update driver location and add to history
 */
driverSchema.methods.updateLocation = function(longitude, latitude) {
  this.currentLocation = {
    type: 'Point',
    coordinates: [longitude, latitude]
  };
  
  // Add to history (keep last 100 locations)
  this.locationHistory.push({
    location: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    timestamp: new Date()
  });
  
  // Keep only last 100 locations to prevent unbounded growth
  if (this.locationHistory.length > 100) {
    this.locationHistory = this.locationHistory.slice(-100);
  }
  
  this.lastLocationUpdate = new Date();
  return this.save();
};

/**
 * Mark driver as available
 */
driverSchema.methods.setAvailable = function() {
  this.status = 'available';
  this.currentOrderId = null;
  return this.save();
};

/**
 * Assign order to driver
 */
driverSchema.methods.assignOrder = function(orderId) {
  this.status = 'busy';
  this.currentOrderId = orderId;
  return this.save();
};

/**
 * Complete delivery and update metrics
 */
driverSchema.methods.completeDelivery = function(onTime = true) {
  this.metrics.totalDeliveries += 1;
  
  // Update on-time delivery rate
  const total = this.metrics.totalDeliveries;
  const currentRate = this.metrics.onTimeDeliveryRate;
  this.metrics.onTimeDeliveryRate = ((currentRate * (total - 1)) + (onTime ? 100 : 0)) / total;
  
  this.status = 'available';
  this.currentOrderId = null;
  
  return this.save();
};

/**
 * Update driver rating
 */
driverSchema.methods.updateRating = function(newRating) {
  const currentAvg = this.metrics.rating.average;
  const count = this.metrics.rating.count;
  
  this.metrics.rating.average = ((currentAvg * count) + newRating) / (count + 1);
  this.metrics.rating.count += 1;
  
  return this.save();
};

/**
 * Static method: Find available drivers near a location
 * 
 * Uses MongoDB $near operator with 2dsphere index
 * Returns drivers sorted by distance
 */
driverSchema.statics.findNearby = function(longitude, latitude, maxDistanceKm = 5, limit = 10) {
  return this.find({
    status: 'available',
    isActive: true,
    currentLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistanceKm * 1000 // Convert km to meters
      }
    }
  })
  .limit(limit)
  .select('name phone vehicle currentLocation metrics.rating');
};

/**
 * Static method: Find drivers within a polygon area
 */
driverSchema.statics.findInArea = function(polygonCoordinates) {
  return this.find({
    status: 'available',
    isActive: true,
    currentLocation: {
      $geoWithin: {
        $geometry: {
          type: 'Polygon',
          coordinates: polygonCoordinates
        }
      }
    }
  });
};

module.exports = mongoose.model('Driver', driverSchema);
