const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');

const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb://admin:admin123@localhost:27017/restaurant_service?authSource=admin';

const cuisineTypes = [
  'Italian', 'Chinese', 'Japanese', 'Mexican', 'Indian', 
  'Thai', 'American', 'Mediterranean', 'French', 'Korean'
];

const categories = ['appetizer', 'main', 'dessert', 'beverage', 'side'];

const priceRanges = ['$', '$$', '$$$', '$$$$'];

// Restaurant Schema (must match src/models/Restaurant.js)
const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  cuisineType: { type: String, required: true },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number] // [longitude, latitude]
    }
  },
  phone: { type: String },
  email: { type: String },
  openingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  menuItems: [{
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    category: { type: String, enum: categories, required: true },
    imageUrl: String,
    isAvailable: { type: Boolean, default: true },
    dietaryInfo: [String],
    preparationTime: Number
  }],
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  priceRange: { type: String, enum: priceRanges },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

restaurantSchema.index({ name: 'text', description: 'text', cuisineType: 'text' });
restaurantSchema.index({ 'address.coordinates': '2dsphere' });

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

function generateMenuItem(cuisineType) {
  const dietaryOptions = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free'];
  const randomDietary = faker.helpers.arrayElements(dietaryOptions, faker.number.int({ min: 0, max: 2 }));

  return {
    name: faker.commerce.productName(),
    description: faker.lorem.sentence(),
    price: parseFloat(faker.commerce.price({ min: 5, max: 50, dec: 2 })),
    category: faker.helpers.arrayElement(categories),
    imageUrl: `https://picsum.photos/400/300?random=${faker.number.int({ min: 1, max: 1000 })}`,
    isAvailable: faker.datatype.boolean({ probability: 0.9 }),
    dietaryInfo: randomDietary,
    preparationTime: faker.number.int({ min: 10, max: 45 })
  };
}

function generateRestaurant() {
  const cuisineType = faker.helpers.arrayElement(cuisineTypes);
  const city = faker.location.city();
  const state = faker.location.state({ abbreviated: true });
  
  // Generate coordinates for realistic locations (US bounds)
  const latitude = faker.location.latitude({ min: 25, max: 49 });
  const longitude = faker.location.longitude({ min: -125, max: -65 });

  const menuItemCount = faker.number.int({ min: 8, max: 20 });
  const menuItems = Array.from({ length: menuItemCount }, () => generateMenuItem(cuisineType));

  return {
    name: `${faker.company.name()} ${cuisineType} ${faker.helpers.arrayElement(['Kitchen', 'Bistro', 'Cafe', 'Restaurant', 'Grill', 'House'])}`,
    description: faker.company.catchPhrase(),
    cuisineType,
    address: {
      street: faker.location.streetAddress(),
      city,
      state,
      zipCode: faker.location.zipCode(),
      coordinates: {
        type: 'Point',
        coordinates: [longitude, latitude]
      }
    },
    phone: faker.phone.number(),
    email: faker.internet.email().toLowerCase(),
    openingHours: {
      monday: { open: '09:00', close: '22:00' },
      tuesday: { open: '09:00', close: '22:00' },
      wednesday: { open: '09:00', close: '22:00' },
      thursday: { open: '09:00', close: '22:00' },
      friday: { open: '09:00', close: '23:00' },
      saturday: { open: '10:00', close: '23:00' },
      sunday: { open: '10:00', close: '21:00' }
    },
    menuItems,
    rating: {
      average: parseFloat(faker.number.float({ min: 3.5, max: 5.0, fractionDigits: 1 })),
      count: faker.number.int({ min: 10, max: 500 })
    },
    priceRange: faker.helpers.arrayElement(priceRanges),
    isActive: true
  };
}

async function seedRestaurants(count = 10) {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const restaurants = Array.from({ length: count }, generateRestaurant);

    const result = await Restaurant.insertMany(restaurants, { ordered: false });
    console.log(`✅ Seeded ${result.length} restaurants successfully`);

    // Display sample data
    console.log('\n📋 Sample Restaurant:');
    const sample = restaurants[0];
    console.log(`   Name: ${sample.name}`);
    console.log(`   Cuisine: ${sample.cuisineType}`);
    console.log(`   Location: ${sample.address.city}, ${sample.address.state}`);
    console.log(`   Menu Items: ${sample.menuItems.length}`);
    console.log(`   Rating: ${sample.rating.average} (${sample.rating.count} reviews)`);
    console.log(`   Price Range: ${sample.priceRange}`);

  } catch (error) {
    if (error.code === 11000) {
      console.log('⚠️  Some duplicate restaurants skipped');
    } else {
      console.error('❌ Seeding failed:', error.message);
      process.exit(1);
    }
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

async function cleanRestaurants() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const result = await Restaurant.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} restaurants`);

  } catch (error) {
    console.error('❌ Cleaning failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

async function resetRestaurants(count = 10) {
  await cleanRestaurants();
  await seedRestaurants(count);
}

// CLI
const command = process.argv[2];
const count = parseInt(process.argv[3]) || 10;

switch (command) {
  case 'seed':
    seedRestaurants(count);
    break;
  case 'clean':
    cleanRestaurants();
    break;
  case 'reset':
    resetRestaurants(count);
    break;
  default:
    console.log('Usage:');
    console.log('  node seed-restaurants.js seed [count]   - Add restaurants');
    console.log('  node seed-restaurants.js clean          - Delete all restaurants');
    console.log('  node seed-restaurants.js reset [count]  - Clean and seed');
    process.exit(1);
}
