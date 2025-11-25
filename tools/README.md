# QuickBite Testing Tools

Database seeding and testing utilities for development and testing.

## Prerequisites

**Before running any seeding scripts:**
```bash
# Start infrastructure (MongoDB must be running)
docker-compose up -d
```

The seeding scripts connect directly to MongoDB, so you only need the database container running. The User Service is NOT required for seeding.

## Quick Start

### Option 1: Node.js Script (Recommended for Development)

**Requirements:** Node.js installed locally

```bash
# Install dependencies
cd tools
npm install

# Seed 10 users (default)
node seed-users.js seed

# Seed 100 users
node seed-users.js seed 100

# Clean all users
node seed-users.js clean

# Reset database with fresh data
node seed-users.js reset 50
```

**NPM Scripts:**
```bash
npm run seed        # Add 10 users
npm run seed:100    # Add 100 users
npm run clean       # Delete all users
npm run reset       # Clean and seed 10 users
```

### Option 2: Docker (No Local Dependencies)

**Requirements:** Docker running

```bash
# Make script executable (first time)
chmod +x tools/docker-seed.sh

# Seed users
./tools/docker-seed.sh seed 50

# Clean database
./tools/docker-seed.sh clean

# Reset with fresh data
./tools/docker-seed.sh reset 100
```

### Option 3: API-Based (Tests Full Stack)

**Requirements:** bash, curl, jq, User Service must be running

```bash
# Make script executable (first time)
chmod +x tools/seed-via-api.sh

# Seed users via API
./tools/seed-via-api.sh 20

# With custom API URL
API_URL=http://localhost:3001 ./tools/seed-via-api.sh 10
```

## Generated User Data

**Default Credentials:**
- Admin: `[first user email]` / `password123`
- Users: `user1@example.com` / `password123`

**User Fields:**
- Random realistic names
- Unique emails (user1@example.com, user2@example.com, etc.)
- Random US addresses with coordinates
- Random phone numbers
- First user is always admin role

## Environment Variables

```bash
# MongoDB connection string (use credentials from your .env file)
MONGODB_URI=mongodb://<username>:<password>@localhost:27017/user_service?authSource=admin

# API URL (for API-based seeding)
API_URL=http://localhost:3001
```

## For Windows (PowerShell)

```powershell
# Install dependencies
cd tools
npm install

# Seed users
node seed-users.js seed 50

# Or use Docker
docker run --rm `
  --network quickbite-food-delivery_quickbite-network `
  -v ${PWD}/tools:/tools `
  -w /tools `
  -e MONGODB_URI="mongodb://admin:admin123@quickbite-mongodb:27017/user_service?authSource=admin" `
  node:20-alpine `
  sh -c "npm install --silent && node seed-users.js seed 50"
```

## Use Cases

### Development Testing
```bash
npm run reset       # Fresh start each day
```

### Load Testing
```bash
node seed-users.js seed 10000   # Test with large dataset
```

### Demo Preparation
```bash
npm run clean       # Clean slate
npm run seed        # Add just enough data
```

### CI/CD Pipeline
```bash
./tools/docker-seed.sh reset 50   # No local dependencies
```

## Interview Talking Points

- **Why multiple approaches?** Flexibility for different environments (local dev, CI/CD, containerized)
- **Why not use production seeding?** Separation of concerns; testing data should be easily identifiable and removable
- **Data quality?** Realistic fake data for proper testing, unique constraints handled
- **Performance?** Bulk inserts with error handling for duplicate entries
