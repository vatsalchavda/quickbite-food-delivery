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
```bash
cd tools
npm install
node seed-users.js reset 20    # Create 20 test users
```

**Default credentials:** Check the script output for generated admin/user emails  
**Password:** `password123` (for all users)

### 4. Test the API
```bash
# Health check
curl http://localhost:3001/health

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<admin-email>","password":"password123"}'
```

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
- User Service: http://localhost:3001
- Restaurant Service: http://localhost:3002
- Order Service: http://localhost:3003
- Driver Service: http://localhost:3004
- Notification Service: http://localhost:3005
- API Gateway: http://localhost:3000

## Services

| Service | Port | Description |
|---------|------|-------------|
| User Service | 3001 | Authentication & user management |
| Restaurant Service | 3002 | Restaurant & menu management |
| Order Service | 3003 | Order processing & state management |
| Driver Service | 3004 | Driver tracking & assignment |
| Notification Service | 3005 | Event-driven notifications |
| API Gateway | 3000 | Unified API entry point |

## Tech Stack

**Backend:** Node.js, Express.js  
**Databases:** MongoDB  
**Cache:** Redis  
**Message Broker:** RabbitMQ  
**Frontend:** React, Redux Toolkit, React Bootstrap  
**DevOps:** Docker, Kubernetes, Kustomize  

## Architecture

- Microservices pattern with database per service
- Event-driven communication via RabbitMQ
- Caching layer with Redis
- JWT-based authentication
- API Gateway pattern
- Containerized deployment with Kubernetes

## Project Structure

```
quickbite-food-delivery/
├── services/           # Microservices
├── frontend/          # React application
├── shared/            # Shared utilities
├── infrastructure/    # Docker & K8s configs
└── docs/             # Documentation
```
