# QuickBite Food Delivery
Microservices-based food delivery platform with Node.js, MongoDB, Redis, RabbitMQ, Event Driven Architecture and a React frontend.

## Tech Stack
- Backend: Node.js 20, Express, MongoDB, Redis, RabbitMQ
- Gateway: Express, Axios, Opossum circuit breaker, rate limiting
- Frontend: React 18, Vite, React Bootstrap
- Containerization: Docker, Docker Compose

## Core Features & Microservices
- User Service (3001): Auth and user management with JWT; Swagger at `/api-docs`
- Restaurant Service (3002): Restaurants, menus, Redis caching; Swagger at `/api-docs`
- Order Service (3003): Order lifecycle with RabbitMQ publishing; Swagger at `/api-docs`
- Driver Service (3004): Driver profiles, status, geospatial queries (`/api/drivers/nearby`)
- Notification Service (3005): RabbitMQ consumer with `/health`
- API Gateway (3000): Central routing, JWT validation, rate limiting, circuit breaker
- Customer Frontend (5173): Browse restaurants, menus, cart, orders (proxy via gateway)

## Setup & Usage
1) Configure environment:
```bash
cp .env.example .env
# set MONGO_ROOT_PASSWORD, RABBITMQ_PASSWORD, JWT_SECRET, and other required values
```
2) Start all services:
```bash
docker-compose up -d --build
```
3) Access:
- Gateway: http://localhost:3000
- Frontend (dev): `cd frontend/customer-app && npm install && npm run dev` (http://localhost:5173)
- Frontend via Docker: http://localhost:5173

## API Documentation
- User Service: http://localhost:3001/api-docs
- Restaurant Service: http://localhost:3002/api-docs
- Order Service: http://localhost:3003/api-docs

## Future Enhancements
- Add Swagger for Driver and Notification services and integrate payment processing.
- Add Kubernetes operator infrastructure.