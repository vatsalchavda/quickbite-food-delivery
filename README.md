# QuickBite Food Delivery

A microservices-based food delivery platform built with Node.js, Express, MongoDB, Redis, RabbitMQ, and Kubernetes.

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Kubernetes (Minikube/Docker Desktop) (optional, for K8s deployment)

### Start All Services
```bash
docker-compose up -d --build
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
