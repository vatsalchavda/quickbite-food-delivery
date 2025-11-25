#!/bin/bash

# Seed users using Docker (no local dependencies needed)
# Usage: ./tools/docker-seed.sh [seed|clean|reset] [count]

COMMAND="${1:-seed}"
COUNT="${2:-10}"

echo "🐳 Running seed script in Docker container..."

docker run --rm \
  --network quickbite-food-delivery_quickbite-network \
  -v "$(pwd)/tools:/tools" \
  -w /tools \
  -e MONGODB_URI="mongodb://${MONGO_ROOT_USERNAME}:${MONGO_ROOT_PASSWORD}@quickbite-mongodb:27017/user_service?authSource=admin" \
  node:20-alpine \
  sh -c "npm install --silent && node seed-users.js $COMMAND $COUNT"

echo ""
echo "✅ Docker seed completed!"
