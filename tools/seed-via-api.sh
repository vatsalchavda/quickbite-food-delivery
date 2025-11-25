#!/bin/bash

# Seed users via API endpoints (tests the full stack)
# Usage: ./tools/seed-via-api.sh [count]

API_URL="${API_URL:-http://localhost:3001}"
COUNT="${1:-10}"

echo "🔧 Seeding $COUNT users via API at $API_URL"
echo ""

for i in $(seq 1 $COUNT); do
  ROLE="customer"
  if [ $i -eq 1 ]; then
    ROLE="admin"
  fi
  
  EMAIL="user${i}@example.com"
  
  echo "Creating user $i/$COUNT: $EMAIL"
  
  curl -s -X POST "$API_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Test User $i\",
      \"email\": \"$EMAIL\",
      \"password\": \"password123\",
      \"phone\": \"+1555000${i}\",
      \"address\": {
        \"street\": \"$i Test St\",
        \"city\": \"Test City\",
        \"state\": \"TS\",
        \"zipCode\": \"12345\"
      }
    }" | jq -r '.message // .error' || echo "Failed"
  
  sleep 0.1  # Rate limiting
done

echo ""
echo "✅ Done! Created $COUNT users"
echo "💡 Login credentials: user1@example.com / password123"
