const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
require('dotenv').config();

// Import models
const Order = require('../services/order-service/src/models/Order');

const MONGO_URI = `mongodb://${process.env.MONGO_ROOT_USERNAME}:${process.env.MONGO_ROOT_PASSWORD}@localhost:27017/${process.env.ORDER_DB || 'order_service'}?authSource=admin`;

/**
 * Generate random order data
 * 
 * Note: In a real system, these IDs would come from User and Restaurant services
 * For demo purposes, we're generating random MongoDB ObjectIds
 */
const generateOrder = () => {
  const deliveryType = faker.helpers.arrayElement(['DELIVERY', 'PICKUP']);
  const itemCount = faker.number.int({ min: 1, max: 5 });
  
  const items = Array.from({ length: itemCount }, () => {
    const price = faker.number.float({ min: 8, max: 30, fractionDigits: 2 });
    const quantity = faker.number.int({ min: 1, max: 3 });
    
    return {
      menuItemId: new mongoose.Types.ObjectId(),
      name: faker.helpers.arrayElement([
        'Margherita Pizza',
        'Pepperoni Pizza',
        'Chicken Tikka Masala',
        'Pad Thai',
        'Burger & Fries',
        'Caesar Salad',
        'Sushi Roll',
        'Tacos',
        'Ramen Bowl',
        'Pasta Carbonara'
      ]),
      quantity,
      price,
      specialInstructions: faker.datatype.boolean(0.3) ? faker.lorem.sentence() : undefined
    };
  });
  
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = deliveryType === 'DELIVERY' ? faker.number.float({ min: 3, max: 8, fractionDigits: 2 }) : 0;
  const tax = subtotal * 0.08; // 8% tax
  const tip = deliveryType === 'DELIVERY' ? faker.number.float({ min: 3, max: 10, fractionDigits: 2 }) : 0;
  const total = subtotal + deliveryFee + tax + tip;
  
  const deliveryAddress = deliveryType === 'DELIVERY' ? {
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    zipCode: faker.location.zipCode(),
    coordinates: {
      type: 'Point',
      coordinates: [
        faker.location.longitude({ min: -125, max: -65 }), // US bounds
        faker.location.latitude({ min: 25, max: 49 })
      ]
    }
  } : undefined;
  
  // Random order status for demo
  const status = faker.helpers.arrayElement([
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED'
  ]);
  
  const statusHistory = [{ status: 'PENDING', timestamp: faker.date.recent({ days: 2 }) }];
  
  // Build status history based on current status
  const statusFlow = {
    'CONFIRMED': ['PENDING', 'CONFIRMED'],
    'PREPARING': ['PENDING', 'CONFIRMED', 'PREPARING'],
    'READY': ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'],
    'OUT_FOR_DELIVERY': ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'],
    'DELIVERED': ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'],
    'CANCELLED': ['PENDING', 'CANCELLED']
  };
  
  if (statusFlow[status]) {
    statusHistory.length = 0; // Clear
    statusFlow[status].forEach((s, index) => {
      statusHistory.push({
        status: s,
        timestamp: faker.date.recent({ days: 2 - (index * 0.1) })
      });
    });
  }
  
  const order = {
    customerId: new mongoose.Types.ObjectId(),
    restaurantId: new mongoose.Types.ObjectId(),
    items,
    status,
    statusHistory,
    deliveryType,
    deliveryAddress,
    pricing: {
      subtotal: parseFloat(subtotal.toFixed(2)),
      deliveryFee: parseFloat(deliveryFee.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      tip: parseFloat(tip.toFixed(2)),
      total: parseFloat(total.toFixed(2))
    },
    specialInstructions: faker.datatype.boolean(0.2) ? faker.lorem.sentence() : undefined,
    estimatedDeliveryTime: faker.date.soon({ days: 1 })
  };
  
  // Add driver for delivery orders
  if (deliveryType === 'DELIVERY' && ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(status)) {
    order.driverId = new mongoose.Types.ObjectId();
  }
  
  // Add cancellation info for cancelled orders
  if (status === 'CANCELLED') {
    order.cancelledBy = faker.helpers.arrayElement(['CUSTOMER', 'RESTAURANT', 'SYSTEM']);
    order.cancellationReason = faker.helpers.arrayElement([
      'Customer requested cancellation',
      'Restaurant is too busy',
      'Item out of stock',
      'Payment failed',
      'Delivery address unreachable'
    ]);
  }
  
  // Add delivery time for delivered orders
  if (status === 'DELIVERED') {
    order.actualDeliveryTime = faker.date.recent({ days: 1 });
  }
  
  return order;
};

/**
 * Seed orders to database
 */
const seedOrders = async (count = 20) => {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log(`\n🌱 Generating ${count} orders...`);
    const orders = Array.from({ length: count }, generateOrder);
    
    console.log('📝 Inserting orders into database...');
    const result = await Order.insertMany(orders);
    
    console.log(`✅ Successfully seeded ${result.length} orders!`);
    console.log('\n📊 Order Status Distribution:');
    
    const statusCounts = result.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding orders:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
};

/**
 * Clean all orders from database
 */
const cleanOrders = async () => {
  try {
    console.log('🧹 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const result = await Order.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} orders`);
    
  } catch (error) {
    console.error('❌ Error cleaning orders:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  }
};

// CLI
const command = process.argv[2];
const count = parseInt(process.argv[3]) || 20;

switch (command) {
  case 'seed':
    seedOrders(count);
    break;
  case 'clean':
    cleanOrders();
    break;
  case 'reset':
    cleanOrders().then(() => seedOrders(count));
    break;
  default:
    console.log(`
Usage:
  npm run seed:orders [count]     - Seed orders (default: 20)
  npm run seed:orders:clean        - Delete all orders
  npm run seed:orders:reset [count] - Clean and re-seed orders
    `);
}
