# QuickBite Food Delivery

A microservices-based food delivery platform built with Node.js, Express, MongoDB, Redis, RabbitMQ, and Kubernetes.

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Kubernetes (Minikube/Docker Desktop) (optional, for K8s deployment)

### 1. Setup Environment Variables

**IMPORTANT:** Generate secure passwords before running!

```bash
# Copy environment template
cp .env.example .env

# Generate secure passwords (use these commands or your preferred method)
openssl rand -base64 32   # For MONGO_ROOT_PASSWORD
openssl rand -base64 32   # For RABBITMQ_PASSWORD
openssl rand -base64 64   # For JWT_SECRET

# Edit .env and paste the generated values
```

**Required variables in `.env`:**
- `MONGO_ROOT_PASSWORD` - MongoDB admin password
- `RABBITMQ_PASSWORD` - RabbitMQ password
- `JWT_SECRET` - JWT signing secret

### 2. Start All Services
```bash
docker-compose up -d --build
```

Wait ~30 seconds for services to be healthy.

### 3. Seed Test Data (Optional)

#### User Service
```bash
cd tools
npm install

# Seed 10 users (default)
node seed-users.js seed

# Seed 100 users
node seed-users.js seed 100

# Reset database with fresh data
node seed-users.js reset 50

# Clean all users
node seed-users.js clean
```

**NPM Scripts:**
```bash
npm run seed        # Add 10 users
npm run seed:100    # Add 100 users
npm run clean       # Delete all users
npm run reset       # Clean and seed 10 users
```

#### Restaurant Service
```bash
cd tools

# Seed 15 restaurants with menu items
node seed-restaurants.js seed 15

# Reset with fresh data
node seed-restaurants.js reset 20

# Clean all restaurants
node seed-restaurants.js clean
```

**NPM Scripts:**
```bash
npm run seed:restaurants       # Add 10 restaurants
npm run seed:restaurants:20    # Add 20 restaurants
npm run clean:restaurants      # Delete all restaurants
npm run reset:restaurants      # Clean and seed
```

#### Option 2: Docker (No Local Dependencies)
```bash
# Make script executable (first time only)
chmod +x tools/docker-seed.sh

# Seed users
./tools/docker-seed.sh seed 50

# Reset with fresh data
./tools/docker-seed.sh reset 100
```

**Generated User Data:**
- Admin: First user email / `password123`
- Users: `user1@example.com`, `user2@example.com`, etc. / `password123`
- Random realistic names, addresses, phone numbers
- First user is always admin role

**Generated Restaurant Data:**
- 10+ diverse cuisines (Italian, Chinese, Japanese, Mexican, etc.)
- 8-20 menu items per restaurant
- Realistic ratings, prices, opening hours
- GeoJSON coordinates for location-based queries

### 4. Test the API

#### Swagger UI (Interactive Documentation)
- **User Service:** http://localhost:3001/api-docs
- **Restaurant Service:** http://localhost:3002/api-docs

**Features:**
- Interactive API documentation
- Try endpoints directly from browser
- Auto-generated from code annotations
- Built-in authentication for protected endpoints

**Testing Protected Endpoints:**
1. Use `/api/auth/login` endpoint to get a token
2. Click **Authorize** button (top right)
3. Enter: `Bearer <paste-token-here>`
4. Click **Authorize**
5. Now test protected endpoints like `/api/auth/profile`

#### cURL Commands

**User Service:**
```bash
# Health check
curl http://localhost:3001/health

# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@example.com","password":"password123"}'

# Get profile (use token from login response)
curl http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer <your-token-here>"
```

**Restaurant Service:**
```bash
# Health check
curl http://localhost:3002/health

# Get restaurants (pagination)
curl "http://localhost:3002/api/restaurants?page=1&limit=10"

# Get restaurant by ID
curl http://localhost:3002/api/restaurants/<restaurant-id>

# Search restaurants
curl "http://localhost:3002/api/restaurants/search?query=pizza"

# Get by cuisine
curl http://localhost:3002/api/restaurants/cuisine/Italian

# Create restaurant
curl -X POST http://localhost:3002/api/restaurants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pizza Palace",
    "description": "Best pizza in town",
    "cuisineType": "Italian",
    "address": {
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zipCode": "94102",
      "coordinates": {
        "type": "Point",
        "coordinates": [-122.4194, 37.7749]
      }
    },
    "phone": "+1-555-1234",
    "email": "info@pizzapalace.com",
    "priceRange": "$$"
  }'

# Add menu item
curl -X POST http://localhost:3002/api/restaurants/<restaurant-id>/menu \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Margherita Pizza",
    "description": "Classic tomato and mozzarella",
    "price": 12.99,
    "category": "main"
  }'
```

**Cache Verification:**
Make the same request twice and check the `source` field in the response:
- First request: `"source": "database"` (cache miss)
- Second request: `"source": "cache"` (cache hit)

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f user-service
```

### Stop Services
```bash
docker-compose down
```

### Access Management UIs
- Mongo Express: http://localhost:8081
- Redis Commander: http://localhost:8082
- RabbitMQ Management: http://localhost:15672 (admin/admin123)

### Access Services
- **API Gateway (Main Entry Point):** http://localhost:3000
- User Service: http://localhost:3001 (internal)
- Restaurant Service: http://localhost:3002 (internal)
- Order Service: http://localhost:3003 (internal)
- Driver Service: http://localhost:3004 (coming soon)
- Notification Service: http://localhost:3005 (coming soon)

## Services

| Service | Port | Description | Status |
|---------|------|-------------|--------|
| **API Gateway** | **3000** | **Unified API entry point with routing, auth, rate limiting, circuit breaker** | **✅ Complete** |
| User Service | 3001 | Authentication & user management | ✅ Complete |
| Restaurant Service | 3002 | Restaurant & menu management with Redis caching | ✅ Complete |
| Order Service | 3003 | Order processing & state management with event publishing | ✅ Complete |
| Driver Service | 3004 | Driver tracking & assignment | 🚧 Coming Soon |
| Notification Service | 3005 | Event-driven notifications | 🚧 Coming Soon |

## Tech Stack

**Backend:** Node.js, Express.js  
**Databases:** MongoDB  
**Cache:** Redis  
**Message Broker:** RabbitMQ  
**API Gateway:** Express.js, Axios, Opossum (circuit breaker), JWT validation  
**Frontend:** React, Redux Toolkit, React Bootstrap  
**DevOps:** Docker, Kubernetes, Kustomize  

## Architecture

- Microservices pattern with database per service
- Event-driven communication via RabbitMQ
- Caching layer with Redis (Restaurant Service)
- JWT-based authentication with centralized validation
- **API Gateway pattern with resilience features:**
  - Request routing to backend services
  - JWT token validation (centralized auth)
  - Rate limiting (3 tiers: general, auth, write)
  - Circuit breaker pattern (fail-fast, automatic recovery)
  - Request/response logging and monitoring
- Containerized deployment with Kubernetes

## Project Structure

```
quickbite-food-delivery/
├── services/           # Microservices
├── frontend/          # React application
├── shared/            # Shared utilities
├── infrastructure/    # Docker & K8s configs
├── tools/             # Database seeding scripts
└── docs/             # Documentation
```

## API Endpoints

### User Service (Port 3001)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | ❌ | Health check |
| `/api/auth/register` | POST | ❌ | Register new user |
| `/api/auth/login` | POST | ❌ | Login user |
| `/api/auth/profile` | GET | ✅ | Get user profile |
| `/api/auth/profile` | PUT | ✅ | Update profile |

**Swagger Documentation:** http://localhost:3001/api-docs

### Restaurant Service (Port 3002)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | ❌ | Health check |
| `/api/restaurants` | GET | ❌ | Get all restaurants (paginated) |
| `/api/restaurants` | POST | ❌ | Create restaurant |
| `/api/restaurants/:id` | GET | ❌ | Get restaurant by ID |
| `/api/restaurants/:id` | PUT | ❌ | Update restaurant |
| `/api/restaurants/:id` | DELETE | ❌ | Delete restaurant (soft delete) |
| `/api/restaurants/search` | GET | ❌ | Search restaurants by text |
| `/api/restaurants/cuisine/:cuisine` | GET | ❌ | Get by cuisine type |
| `/api/restaurants/:id/menu` | POST | ❌ | Add menu item |
| `/api/restaurants/:id/menu/:itemId` | PUT | ❌ | Update menu item |
| `/api/restaurants/:id/menu/:itemId` | DELETE | ❌ | Delete menu item |

**Swagger Documentation:** http://localhost:3002/api-docs

**Caching Features:**
- List endpoints: 5-minute TTL
- Detail endpoints: 10-minute TTL
- Search endpoints: 2-minute TTL
- Cache invalidation on create/update/delete
- Cache hit/miss tracking in response (`source: "cache"` or `"database"`)

### Order Service (Port 3003)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | ❌ | Health check |
| `/api/orders` | POST | ✅ | Create order |
| `/api/orders` | GET | ✅ | Get orders |
| `/api/orders/:id` | GET | ✅ | Get order by ID |
| `/api/orders/:id/confirm` | PUT | ✅ | Confirm order |
| `/api/orders/:id/preparing` | PUT | ✅ | Start preparing |
| `/api/orders/:id/ready` | PUT | ✅ | Mark ready |
| `/api/orders/:id/out-for-delivery` | PUT | ✅ | Out for delivery |
| `/api/orders/:id/delivered` | PUT | ✅ | Mark delivered |
| `/api/orders/:id/cancel` | PUT | ✅ | Cancel order |

**State Machine:**
- 7 states: PENDING → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED (or CANCELLED)
- State transitions with validation
- Event publishing to RabbitMQ on each state change

### API Gateway (Port 3000) - **MAIN ENTRY POINT**

**All client requests should go through the API Gateway**

| Endpoint | Method | Auth | Description | Rate Limit |
|----------|--------|------|-------------|------------|
| `/health` | GET | ❌ | Gateway health check | General |
| `/stats/circuit-breakers` | GET | ❌ | Circuit breaker stats | General |
| `/api/users/register` | POST | ❌ | Register user | Auth (5/15min) |
| `/api/users/login` | POST | ❌ | Login user | Auth (5/15min) |
| `/api/restaurants` | GET | 🔓 | List restaurants | General (100/15min) |
| `/api/restaurants/:id` | GET | 🔓 | Get restaurant | General |
| `/api/restaurants` | POST | ✅ | Create restaurant | Write (20/min) |
| `/api/restaurants/:id` | PUT | ✅ | Update restaurant | Write |
| `/api/restaurants/search` | GET | 🔓 | Search restaurants | General |
| `/api/orders` | POST | ✅ | Create order | Write (20/min) |
| `/api/orders` | GET | ✅ | List orders | General |
| `/api/orders/:id` | GET | ✅ | Get order | General |
| `/api/orders/:id/confirm` | PUT | ✅ | Confirm order | Write |
| `/api/orders/:id/cancel` | PUT | ✅ | Cancel order | Write |

**Resilience Features:**
- **Circuit Breaker:** Automatically fails fast when backend services are down
  - States: CLOSED (normal) → OPEN (failing fast) → HALF_OPEN (testing recovery)
  - Thresholds: 50% error rate, 5 requests minimum
  - Reset timeout: 30 seconds
- **Rate Limiting:** Protects backend services from abuse
  - General: 100 req/15min per IP
  - Auth: 5 req/15min per IP (login/register)
  - Write: 20 req/min per IP (create/update/delete)
- **JWT Validation:** Centralized token verification
- **Request Logging:** All requests logged with duration tracking

**Legend:**
- ✅ Auth Required (Bearer token)
- 🔓 Optional Auth (works with or without token)
- ❌ Public (no auth)

### Coming Soon
- Driver Service (Port 3004) - DAY 5
- Notification Service (Port 3005) - DAY 5

## Development Workflow

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f user-service
```

### Rebuild After Code Changes
```bash
docker-compose up -d --build
```

### Reset Database
```bash
cd tools
npm run reset       # Clean and seed fresh data
```

### Stop Services
```bash
docker-compose down         # Stop but keep data
docker-compose down -v      # Stop and remove volumes (clean slate)
```

## Documentation

- **Technical Concepts:** `docs/KNOWLEDGE_BASE.md` - Distributed systems patterns, caching strategies, interview prep
- **API Documentation:** http://localhost:3001/api-docs (Swagger UI)
- **Seeding Tools:** `tools/` directory with multiple seeding options
