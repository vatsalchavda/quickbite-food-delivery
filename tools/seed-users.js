#!/usr/bin/env node

/**
 * User Database Seeding Script
 * 
 * Usage:
 *   node tools/seed-users.js seed [count]    - Add dummy users (default: 10)
 *   node tools/seed-users.js clean           - Remove all users
 *   node tools/seed-users.js reset [count]   - Clean and seed fresh data
 * 
 * Environment:
 *   Set MONGODB_URI to override default connection
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:changeme@localhost:27017/user_service?authSource=admin';

// User Schema (matching the service)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Sample data generators
const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'Robert', 'Olivia', 'James', 'Sophia'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const streets = ['Main St', 'Oak Ave', 'Maple Dr', 'Pine Rd', 'Cedar Ln', 'Elm St', 'Park Ave', 'Washington Blvd'];
const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'];
const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'TX', 'CA'];

const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function generateUser(index) {
  const firstName = randomElement(firstNames);
  const lastName = randomElement(lastNames);
  const city = randomElement(cities);
  const state = randomElement(states);
  
  return {
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@example.com`,
    password: await bcrypt.hash('password123', 12), // Default password for test users
    phone: `+1${randomNumber(200, 999)}${randomNumber(100, 999)}${randomNumber(1000, 9999)}`,
    role: 'customer',
    address: {
      street: `${randomNumber(100, 9999)} ${randomElement(streets)}`,
      city: city,
      state: state,
      zipCode: `${randomNumber(10000, 99999)}`,
      coordinates: {
        lat: randomNumber(-90, 90) + Math.random(),
        lng: randomNumber(-180, 180) + Math.random(),
      },
    },
    isActive: true,
  };
}

async function seedUsers(count = 10) {
  try {
    console.log(`📝 Generating ${count} dummy users...`);
    
    const users = [];
    
    // First, always add the dedicated admin user
    const adminUser = {
      name: 'Vatsal Chavda',
      email: 'vatsalchavda2@gmail.com',
      password: await bcrypt.hash('superDuperSecret@1', 12),
      phone: '+15551234567',
      role: 'admin',
      address: {
        street: '123 Admin Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        coordinates: {
          lat: 40.7128,
          lng: -74.0060,
        },
      },
      isActive: true,
    };
    users.push(adminUser);
    
    // Then generate remaining random users
    for (let i = 1; i < count; i++) {
      users.push(await generateUser(i));
    }
    
    console.log('💾 Inserting users into database...');
    const result = await User.insertMany(users, { ordered: false });
    
    console.log(`✅ Successfully seeded ${result.length} users!`);
    console.log('\n📋 Credentials:');
    console.log(`   👤 Admin: vatsalchavda2@gmail.com / superDuperSecret@1`);
    if (users.length > 1) {
      console.log(`   👤 Test User: ${users[1]?.email} / password123`);
      console.log('\n💡 Random test users have password: password123');
    }
    
  } catch (error) {
    if (error.code === 11000) {
      console.error('⚠️  Some users already exist (duplicate emails). Inserted unique users.');
    } else {
      console.error('❌ Error seeding users:', error.message);
      throw error;
    }
  }
}

async function cleanUsers() {
  try {
    console.log('🧹 Cleaning user database...');
    const result = await User.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} users from database`);
  } catch (error) {
    console.error('❌ Error cleaning users:', error.message);
    throw error;
  }
}

async function resetUsers(count = 10) {
  console.log('🔄 Resetting user database...\n');
  await cleanUsers();
  console.log('');
  await seedUsers(count);
}

async function main() {
  const command = process.argv[2];
  const countArg = parseInt(process.argv[3]) || 10;
  
  if (!['seed', 'clean', 'reset'].includes(command)) {
    console.log(`
🔧 User Database Seeding Tool

Usage:
  node tools/seed-users.js seed [count]     Add dummy users (default: 10)
  node tools/seed-users.js clean            Remove all users
  node tools/seed-users.js reset [count]    Clean and seed fresh data

Examples:
  node tools/seed-users.js seed 50          Add 50 dummy users
  node tools/seed-users.js clean            Delete all users
  node tools/seed-users.js reset 100        Reset with 100 fresh users

Environment Variables:
  MONGODB_URI    MongoDB connection string
                 Default: mongodb://admin:admin123@localhost:27017/user_service?authSource=admin
    `);
    process.exit(1);
  }
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    switch (command) {
      case 'seed':
        await seedUsers(countArg);
        break;
      case 'clean':
        await cleanUsers();
        break;
      case 'reset':
        await resetUsers(countArg);
        break;
    }
    
    console.log('\n✨ Done!\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

main();
