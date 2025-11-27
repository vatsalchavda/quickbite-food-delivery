const mongoose = require('mongoose');

/**
 * Order State Machine
 * 
 * States:
 * 1. PENDING - Order created, waiting for restaurant confirmation
 * 2. CONFIRMED - Restaurant accepted the order
 * 3. PREPARING - Restaurant is preparing the food
 * 4. READY - Food is ready for pickup/delivery
 * 5. OUT_FOR_DELIVERY - Driver picked up the order (delivery only)
 * 6. DELIVERED - Order completed successfully
 * 7. CANCELLED - Order cancelled by user/restaurant
 * 
 * Valid Transitions:
 * PENDING -> CONFIRMED, CANCELLED
 * CONFIRMED -> PREPARING, CANCELLED
 * PREPARING -> READY, CANCELLED
 * READY -> OUT_FOR_DELIVERY, DELIVERED (pickup), CANCELLED
 * OUT_FOR_DELIVERY -> DELIVERED, CANCELLED
 * DELIVERED -> (terminal state)
 * CANCELLED -> (terminal state)
 */

const orderItemSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  specialInstructions: String
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: false // Auto-generated in pre-save hook
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  items: {
    type: [orderItemSchema],
    required: true,
    validate: {
      validator: (items) => items.length > 0,
      message: 'Order must contain at least one item'
    }
  },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING',
    index: true
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String
  }],
  deliveryType: {
    type: String,
    enum: ['DELIVERY', 'PICKUP'],
    required: true
  },
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      }
    }
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  pricing: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: 0
    },
    tax: {
      type: Number,
      required: true,
      min: 0
    },
    tip: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  specialInstructions: String,
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  cancellationReason: String,
  cancelledBy: {
    type: String,
    enum: ['CUSTOMER', 'RESTAURANT', 'SYSTEM']
  },
  // Idempotency key for preventing duplicate orders
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, status: 1 });
orderSchema.index({ driverId: 1, status: 1 });

// Generate unique order number
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.orderNumber = `ORD-${timestamp}-${random}`;
  }
  next();
});

// Add status to history before saving
orderSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date()
    });
  }
  next();
});

// State machine validation
orderSchema.methods.canTransitionTo = function(newStatus) {
  const currentStatus = this.status;
  
  const validTransitions = {
    'PENDING': ['CONFIRMED', 'CANCELLED'],
    'CONFIRMED': ['PREPARING', 'CANCELLED'],
    'PREPARING': ['READY', 'CANCELLED'],
    'READY': ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
    'OUT_FOR_DELIVERY': ['DELIVERED', 'CANCELLED'],
    'DELIVERED': [],
    'CANCELLED': []
  };
  
  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

// Transition to new status with validation
orderSchema.methods.transitionTo = function(newStatus, note = '') {
  if (!this.canTransitionTo(newStatus)) {
    throw new Error(
      `Invalid state transition from ${this.status} to ${newStatus}`
    );
  }
  
  this.status = newStatus;
  
  if (note) {
    this.statusHistory[this.statusHistory.length - 1].note = note;
  }
  
  // Set delivery time for terminal states
  if (newStatus === 'DELIVERED' && !this.actualDeliveryTime) {
    this.actualDeliveryTime = new Date();
  }
  
  return this;
};

// Check if order is in terminal state
orderSchema.methods.isTerminal = function() {
  return ['DELIVERED', 'CANCELLED'].includes(this.status);
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
