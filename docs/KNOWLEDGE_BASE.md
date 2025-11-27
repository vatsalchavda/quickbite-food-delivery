# QuickBite Food Delivery - Complete Technical Guide

> **Purpose:** Comprehensive guide covering distributed systems concepts, implementation details, design trade-offs, and production scaling strategies. Built progressively from basics to enterprise-scale architecture.

---

## 📋 Project Overview

### High-Level Architecture

```
Client/Mobile → API Gateway → [User, Restaurant, Order, Driver, Notification Services]
                           ↓
                   [MongoDB, Redis, RabbitMQ]
```

**System Characteristics:**
- **Microservices:** 6 independent services with dedicated databases
- **Event-Driven:** Asynchronous communication via RabbitMQ
- **Resilient:** Circuit breakers, rate limiting, health checks, graceful degradation
- **Scalable:** Stateless services, horizontal scaling, caching layers
- **Observable:** Structured logging, health checks, metrics-ready
- **Containerized:** Docker for development, Kubernetes-ready for production

### Technology Stack Rationale

| Layer | Technology | Why This Choice |
|-------|------------|-----------------|
| **Runtime** | Node.js 20 | Async I/O, event loop perfect for high concurrency, non-blocking operations |
| **Framework** | Express.js | Lightweight, massive ecosystem, middleware-based (flexible), battle-tested |
| **Databases** | MongoDB 7.0 | Document model (flexible schema), geospatial support, horizontal scaling via sharding |
| **Cache** | Redis 7.2 | In-memory speed (sub-ms), rich data structures, TTL support, pub/sub for events |
| **Message Broker** | RabbitMQ 3.13 | Guaranteed delivery, flexible routing, dead letter queues, mature ecosystem |
| **API Gateway** | Express + Axios | Custom logic possible (vs Nginx), circuit breaker integration, same stack as services |
| **Auth** | JWT | Stateless (scales horizontally), self-contained, no session store needed |
| **Containers** | Docker | Consistent environments, dependency isolation, matches production |
| **Orchestration** | Kubernetes | Auto-scaling, self-healing, rolling updates, industry standard |

**Trade-offs Considered:**
- **Node.js vs Go/Java:** Node.js for developer productivity, Go for raw performance (we prioritize speed of development)
- **MongoDB vs PostgreSQL:** MongoDB for flexible schema and geospatial, PostgreSQL for complex joins (we have simple data model)
- **RabbitMQ vs Kafka:** RabbitMQ for message queuing patterns, Kafka for event streaming/logs (we need guaranteed delivery)
- **Custom Gateway vs Kong/Nginx:** Custom for flexibility and learning, Kong for enterprise features (we need control)

---

## 🚨 CRITICAL PROJECT GUIDELINES 🚨

### Docker & Dependency Management (STRICT RULE)

**MANDATORY APPROACH FOR ALL SERVICES:**

1. **ALL dependencies MUST be installed inside Docker containers during build**
   - ❌ NEVER run `npm install` locally in service directories
   - ✅ ALWAYS use Dockerfile multi-stage builds to install dependencies
   - ✅ Dependencies are part of the container image, NOT local filesystem

2. **Dockerfile Best Practices (Industry Standard):**
   ```dockerfile
   # Multi-stage build for smaller production images
   FROM node:20-alpine AS base
   
   # Dependencies stage
   FROM base AS dependencies
   WORKDIR /app
   COPY shared ./shared
   COPY services/<service-name>/package*.json ./
   RUN npm install
   
   # Production dependencies only
   FROM base AS production-dependencies
   WORKDIR /app
   COPY shared ./shared
   COPY services/<service-name>/package*.json ./
   RUN npm install --omit=dev
   
   # Production stage
   FROM base AS production
   WORKDIR /app
   
   # Install dumb-init for proper signal handling
   RUN apk add --no-cache dumb-init
   
   # Create non-root user
   RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
   
   # Copy dependencies and source
   COPY --from=production-dependencies /app/node_modules ./node_modules
   COPY --chown=nodejs:nodejs shared ./src/shared
   COPY --chown=nodejs:nodejs services/<service-name>/src ./src
   
   # Switch to non-root user
   USER nodejs
   
   # Health check
   HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
     CMD node -e "require('http').get('http://localhost:<PORT>/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"
   
   # Use dumb-init for signal handling
   ENTRYPOINT ["dumb-init", "--"]
   CMD ["node", "src/server.js"]
   ```

3. **Why This Approach:**
   - ✅ Consistent environments (dev = prod)
   - ✅ No "works on my machine" issues
   - ✅ Dependencies are versioned with container image
   - ✅ Easier CI/CD pipelines
   - ✅ Follows 12-factor app methodology

4. **Local Development:**
   - Use `docker-compose up -d --build` to rebuild after code changes
   - Use volume mounts in docker-compose.yml for hot-reload (if needed)
   - NO local node_modules directories in service folders

**THIS IS NON-NEGOTIABLE. FOLLOW FOR EVERY SERVICE.**

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [DAY 1: User Service & Authentication](#day-1-infrastructure--user-service)
3. [DAY 2: Restaurant Service & Caching](#day-2-restaurant-service--caching)
4. [DAY 3: Order Service & Events](#day-3-order-service--events)
5. [DAY 4: API Gateway & Resilience](#day-4-api-gateway--resilience)
6. [DAY 5: Driver Service & Geospatial](#day-5-driver-service--geospatial-queries)
7. [DAY 6: Notification Service & Event Consumers](#day-5-notification-service--event-consumers)
8. [Design Patterns Deep Dive](#design-patterns-deep-dive)
9. [Scaling to Production (Uber Eats Scale)](#scaling-to-production-uber-eats-scale)
10. [Common Pitfalls & Debugging](#common-pitfalls--debugging)
11. [Interview Question Bank](#interview-question-bank)

---

## DAY 1: Infrastructure & User Service

### Distributed Systems Concepts

#### Service Isolation & Database-per-Service Pattern

**What:** Each microservice owns its own database schema/instance
- User Service → `user_service` database
- Restaurant Service → `restaurant_service` database

**Why:**
- **Service autonomy:** Teams can develop independently
- **Fault isolation:** Database failure in one service doesn't affect others
- **Technology flexibility:** Different services can use different DB technologies
- **Independent scaling:** Scale databases based on service-specific load

**Trade-offs:**
- ❌ No ACID transactions across services
- ❌ Data duplication required
- ✅ Must use eventual consistency patterns (sagas, events)

**Interview Question:** "Why not share one database across all microservices?"
**Answer:** Shared database creates tight coupling, prevents independent deployment, becomes a single point of failure, and violates service autonomy principle.

---

#### Stateless Authentication with JWT

**What:** JSON Web Tokens for authentication without server-side session storage

**Why JWT over Sessions in Microservices:**
- **Stateless:** No session storage needed, scales horizontally
- **Distributed:** Token contains user info, any service can validate
- **No sticky sessions:** Load balancer can route to any instance
- **Service-to-service:** Easy to pass authentication between services

**JWT Structure:**
```
Header.Payload.Signature
eyJhbGci...  (base64 encoded)
```

**Security Considerations:**
- Store JWT_SECRET securely (environment variables)
- Set reasonable expiration (we use 7 days)
- Cannot revoke tokens (trade-off for statelessness)
- Use HTTPS in production

**Interview Question:** "How do you handle distributed authentication?"
**Answer:** JWT tokens allow stateless authentication. Each service validates tokens using the same secret. No central session store needed, enabling horizontal scaling.

---

### Technical Decisions

#### Winston Logger with Correlation IDs

**Purpose:** Distributed tracing across microservices

**How it works:**
1. Request arrives → Generate UUID correlation ID
2. Add to request object: `req.correlationId`
3. Include in all log entries
4. Pass to downstream services via headers

**Benefits:**
- Trace single request across multiple services
- Debug issues in distributed systems
- Aggregate logs by correlation ID

**Code Location:** `shared/middleware/correlationId.js`

---

## DAY 2: Restaurant Service & Caching

### Distributed Systems Concepts

#### Read-Heavy vs Write-Heavy Systems

**Restaurant Service = Read-Heavy:**
- **Read operations:** Users browsing menus (high frequency)
- **Write operations:** Restaurant updates (low frequency)
- **Optimization strategy:** Aggressive caching

**Caching Benefits:**
- Reduce database load by 80-90%
- Lower response latency (Redis: ~1ms vs MongoDB: ~10-100ms)
- Handle traffic spikes without scaling database

**Interview Question:** "How do you identify if a service is read-heavy?"
**Answer:** Analyze request patterns. If reads vastly outnumber writes (90%+ reads), implement caching. Restaurant browsing is naturally read-heavy - thousands browse, few create restaurants.

---

#### Cache-Aside Pattern (Lazy Loading)

**Flow:**
```
1. Application checks cache first
   ├─ Cache HIT → Return cached data
   └─ Cache MISS → Fetch from database
                 → Store in cache
                 → Return data
```

**vs Other Patterns:**

| Pattern | When to Use | Pros | Cons |
|---------|-------------|------|------|
| **Cache-Aside** | Read-heavy apps | Full control, only cache what's needed | Cache miss penalty |
| **Write-Through** | Write-heavy apps | Cache always consistent | Write latency, cache all writes |
| **Write-Behind** | Batch updates | Async writes, fast | Risk of data loss |
| **Read-Through** | Simple cases | Transparent caching | Less control |

**Our Choice:** Cache-aside for restaurant data
- We control what to cache (popular restaurants)
- Tolerate cache miss penalty (rare)
- Simple invalidation strategy

**Code Location:** `services/restaurant-service/src/config/redis.js`

---

#### TTL (Time To Live) Strategy

**What:** Automatic cache expiration after N seconds

**Our TTL Strategy:**
- Restaurant list: **5 minutes** (300s) - Changes infrequently
- Single restaurant: **10 minutes** (600s) - Very stable
- Search results: **2 minutes** (120s) - More volatile

**Why Use TTL:**
- **Prevents stale data** without manual invalidation
- **Automatic cleanup** of old cache entries
- **Simplicity** over complex invalidation logic

**Trade-off:**
- ✅ Simple implementation
- ✅ Guarantees eventual consistency
- ❌ May serve slightly stale data
- ❌ Cache misses after TTL expires (even if data unchanged)

**Interview Question:** "How do you prevent cache from serving stale data?"
**Answer:** TTL ensures data expires automatically. Balance: shorter TTL = fresher data but more cache misses. We use 5-10 min for restaurant data since it changes rarely.

---

#### Cache Invalidation Strategies

> **Famous Quote:** "There are only two hard things in Computer Science: cache invalidation and naming things." - Phil Karlton

**Our Invalidation Strategy:**

1. **On Restaurant Update:**
   ```javascript
   // Delete specific restaurant cache
   await cache.del(`restaurant:${id}`);
   
   // Delete related list caches
   await cache.delPattern('restaurants:list:*');
   await cache.delPattern('restaurants:search:*');
   ```

2. **On Restaurant Create:**
   ```javascript
   // Clear all list/search caches (new restaurant should appear)
   await cache.delPattern('restaurants:*');
   ```

3. **On Menu Item Update:**
   ```javascript
   // Delete entire restaurant cache (menu is embedded)
   await cache.del(`restaurant:${restaurantId}`);
   ```

**Pattern-Based Invalidation:**
- `restaurants:*` → All restaurant-related caches
- `restaurants:list:*` → All list views
- `restaurants:search:*` → All search results

**Interview Question:** "What are the challenges of cache invalidation?"
**Answer:** (1) Knowing when to invalidate, (2) Invalidating related data, (3) Race conditions during updates, (4) Cache stampede (thundering herd). We use pattern-based invalidation to clear related caches and TTL as a safety net.

---

#### Thundering Herd Problem

**What:** Many requests simultaneously try to regenerate a missing cache entry

**Scenario:**
```
1. Cache entry expires
2. 1000 concurrent requests arrive
3. All see cache miss
4. All query database simultaneously
5. Database overload!
```

**Solutions:**

1. **Probabilistic Early Expiration** (not implemented yet)
   - Refresh cache before TTL expires
   - Random jitter prevents simultaneous refreshes

2. **Lock-Based Refresh** (not implemented yet)
   - First request acquires lock
   - Others wait for cache to populate

3. **Stale-While-Revalidate** (not implemented yet)
   - Serve stale data
   - Async refresh in background

**Current Mitigation:**
- Database can handle moderate load
- Connection pooling in MongoDB
- Can add locking if needed

**Interview Question:** "What is the thundering herd problem in caching?"
**Answer:** When a popular cache entry expires, many requests simultaneously try to regenerate it, overwhelming the database. Solutions include request coalescing, probabilistic refresh, or serving stale data while revalidating.

---

### Database Design for Caching

#### Embedded vs Referenced Data

**Our Choice: Embedded Menu Items**

```javascript
// EMBEDDED (Our approach)
{
  _id: "restaurant123",
  name: "Pizza Place",
  menu: [
    { _id: "item1", name: "Margherita", price: 12.99 },
    { _id: "item2", name: "Pepperoni", price: 14.99 }
  ]
}
```

**Why Embed:**
- ✅ Single database query gets everything
- ✅ Single cache entry contains complete data
- ✅ Atomic updates (MongoDB document updates are atomic)
- ✅ Better read performance (typical use case)

**Trade-offs:**
- ❌ Document size limits (16MB in MongoDB - not a concern for menus)
- ❌ Updating one menu item invalidates entire restaurant cache
- ❌ Duplication if menu items shared across restaurants (rare)

**Alternative: Referenced**
```javascript
// REFERENCED (Not used)
Restaurant: { _id: "r1", name: "Pizza Place", menuItemIds: ["item1", "item2"] }
MenuItem: { _id: "item1", name: "Margherita", price: 12.99 }
```
- Requires multiple queries or joins
- More complex caching (cache menu items separately?)
- Better for frequently changing data

**Interview Question:** "When do you embed vs reference in MongoDB?"
**Answer:** Embed when data is accessed together and doesn't grow unbounded. Reference when data is large, changes independently, or is shared across documents. For restaurant menus, embedding optimizes the common read pattern (browsing menus).

---

#### MongoDB Indexes for Performance

**Text Indexes** (Full-Text Search):
```javascript
restaurantSchema.index({ name: 'text', description: 'text', cuisine: 'text' });
```
- Enables: "Find Italian restaurants with pizza in description"
- Use case: Search bar functionality
- Trade-off: Slower writes, more storage

**Geospatial Indexes** (Location Queries):
```javascript
restaurantSchema.index({ 'address.coordinates': '2dsphere' });
```
- Enables: "Restaurants within 5km of my location"
- Use case: Location-based filtering (not yet implemented)
- MongoDB supports: `$near`, `$geoWithin` queries

**Regular Indexes** (Fast Filtering):
```javascript
cuisine: { index: true }  // Filter by cuisine type
ownerId: { index: true }  // "My restaurants" query
```

**Interview Question:** "How do indexes affect caching strategy?"
**Answer:** Indexes speed up database queries, reducing cache miss penalty. For restaurant search, text indexes make database queries fast enough that we can tolerate cache misses. Without indexes, cache misses would be prohibitively slow.

---

#### Cache Key Naming Convention

**Pattern:** `resource:operation:params`

**Examples:**
- `restaurant:${id}` → Single restaurant
- `restaurants:list:page:1` → First page of restaurants
- `restaurants:search:pizza` → Search results for "pizza"
- `restaurants:owner:${ownerId}` → Owner's restaurants

**Benefits:**
- **Descriptive:** Know what's cached from key name
- **Pattern matching:** Easy to invalidate related caches
- **Collision avoidance:** Unique keys across operations

**Interview Question:** "How do you design cache keys?"
**Answer:** Use hierarchical naming (resource:operation:params), include all parameters that affect the result, avoid collisions, support pattern-based invalidation.

---

### Graceful Degradation

**Principle:** System continues functioning when cache fails

**Implementation in Redis Wrapper:**
```javascript
if (!this.isConnected) {
  logger.warn('Redis not connected, skipping cache');
  return null;  // Continue without cache
}
```

**Behavior:**
- Redis down → App uses database only
- Redis slow → Timeout and fallback to database
- Redis errors → Catch and return null

**Why This Matters:**
- **Availability over consistency:** Better to serve slow than fail
- **Cache as optimization:** Not a critical component
- **Production resilience:** Don't crash on cache failure

**Interview Question:** "What happens if your cache goes down?"
**Answer:** Graceful degradation - the application continues using the database directly. Response times increase but service remains available. Cache is an optimization, not a requirement. Monitor cache hit rates to detect issues.

---

## DAY 4: API Gateway & Resilience

### API Gateway Pattern

**What:** Single entry point for all client requests that routes to appropriate backend services

**Our Implementation:**
```
Client → API Gateway (3000) → User Service (3001)
                            → Restaurant Service (3002)
                            → Order Service (3003)
```

**Why API Gateway:**
- **Single Entry Point:** Clients don't need to know about individual services
- **Centralized Cross-Cutting Concerns:**
  - Authentication/Authorization
  - Rate limiting
  - Logging and monitoring
  - Request/response transformation
- **Service Abstraction:** Backend services can change without affecting clients
- **Simplified Client Code:** One base URL instead of multiple service endpoints

**Trade-offs:**
- ✅ Simplifies client development
- ✅ Reduces client-service coupling
- ✅ Centralized security and monitoring
- ❌ Single point of failure (mitigate with clustering)
- ❌ Additional network hop (adds latency)
- ❌ Gateway can become bottleneck (scale horizontally)

**Interview Question:** "Why use an API Gateway instead of direct service calls?"
**Answer:** API Gateway provides a unified entry point that handles cross-cutting concerns like authentication, rate limiting, and routing. It decouples clients from backend service topology, simplifies client code, and enables centralized monitoring. Trade-offs include additional latency and potential bottleneck, which we mitigate through horizontal scaling and efficient routing.

---

### Circuit Breaker Pattern

**What:** Prevents cascading failures by failing fast when a service is down

**States:**
1. **CLOSED** (Normal): Requests pass through, success/failure tracked
2. **OPEN** (Failing): Requests fail immediately without calling service
3. **HALF_OPEN** (Testing): Limited requests allowed to test if service recovered

**Our Implementation (Opossum Library):**
```javascript
const CircuitBreaker = require('opossum');

const breaker = new CircuitBreaker(httpCall, {
  timeout: 5000,                    // Request timeout
  errorThresholdPercentage: 50,     // Open if 50% fail
  resetTimeout: 30000,              // Try recovery after 30s
  rollingCountTimeout: 10000,       // 10s rolling window
  volumeThreshold: 5                // Need 5 requests before opening
});

breaker.on('open', () => logger.error('Circuit OPENED'));
breaker.on('halfOpen', () => logger.warn('Circuit HALF-OPEN'));
breaker.on('close', () => logger.info('Circuit CLOSED'));
```

**Flow Example:**
```
1. Order Service is down
2. First 5 requests fail (volumeThreshold)
3. Circuit opens → Future requests fail immediately
4. After 30s (resetTimeout) → Circuit goes to HALF_OPEN
5. Test request succeeds → Circuit closes
6. Normal operation resumes
```

**Why This Matters:**
- **Fail Fast:** Don't wait for timeouts on dead services (5s → instant)
- **Resource Protection:** Prevent thread/connection exhaustion
- **Automatic Recovery:** Self-healing when service comes back
- **User Experience:** Fast failures better than hanging requests

**Interview Question:** "Explain the circuit breaker pattern and when to use it."
**Answer:** Circuit breaker prevents cascading failures in distributed systems by failing fast when a service is unhealthy. It has three states: CLOSED (normal), OPEN (failing fast), and HALF_OPEN (testing recovery). Use it when calling external services or microservices to prevent resource exhaustion and improve user experience during failures. Configuration includes error thresholds, timeouts, and reset periods.

---

### Rate Limiting Strategies

**What:** Limit number of requests per time window to prevent abuse and ensure fair resource allocation

**Our Implementation (3-Tier Strategy):**

**1. General API Limiter:**
```javascript
// 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
```
- Applied to: All GET endpoints (browsing)
- Purpose: Prevent excessive scraping/crawling

**2. Authentication Limiter:**
```javascript
// 5 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true  // Only count failures
});
```
- Applied to: Login/register endpoints
- Purpose: Prevent brute force attacks
- Note: Successful logins don't count toward limit

**3. Write Operation Limiter:**
```javascript
// 20 requests per minute per IP
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20
});
```
- Applied to: Create/update/delete endpoints
- Purpose: Prevent spam and database overload

**Rate Limiting Algorithms:**

**Sliding Window (Our Choice):**
- Tracks requests in rolling time window
- Smooths out traffic spikes
- More accurate than fixed window

**Token Bucket (Alternative):**
- Tokens added at fixed rate
- Request consumes token
- Allows bursts up to bucket size

**Fixed Window (Simpler):**
- Reset counter at fixed intervals
- Can have "double dipping" at boundaries
- Easier to implement but less accurate

**Interview Question:** "How do you implement rate limiting in a distributed system?"
**Answer:** Use Redis as shared state for distributed rate limiting. Store counters with expiry (TTL) per IP or user. Implement sliding window algorithm for accuracy. Have multiple tiers based on endpoint sensitivity (strict for auth, lenient for reads). Return 429 status with Retry-After header. Consider allowing burst traffic with token bucket algorithm.

---

### Request Routing & Proxying

**What:** Forward requests from gateway to appropriate backend service

**Our Approach (Axios with Circuit Breaker):**
```javascript
const callWithCircuitBreaker = async (serviceName, url, options) => {
  const breaker = getCircuitBreaker(serviceName);
  const data = await breaker.fire(url, options);
  return data;
};

// Example: Route to Order Service
router.post('/api/orders', authenticateToken, writeLimiter, async (req, res) => {
  const data = await callWithCircuitBreaker(
    'order-service',
    'http://quickbite-order-service:3003/api/orders',
    { method: 'POST', data: req.body }
  );
  res.status(201).json(data);
});
```

**Alternative Approaches:**

**1. HTTP Proxy Middleware:**
```javascript
const { createProxyMiddleware } = require('http-proxy-middleware');

app.use('/api/orders', createProxyMiddleware({
  target: 'http://order-service:3003',
  changeOrigin: true
}));
```
- Pros: Less code, streaming support
- Cons: Harder to add circuit breaker

**2. Service Mesh (Advanced):**
- Istio/Linkerd handle routing at infrastructure level
- Gateway becomes thinner
- Better for large-scale systems

**Why Axios + Circuit Breaker:**
- ✅ Explicit control over request/response
- ✅ Easy circuit breaker integration
- ✅ Error handling and transformation
- ✅ Works well for REST APIs

**Interview Question:** "How do you route requests in an API Gateway?"
**Answer:** Use HTTP client (Axios) to forward requests to backend services. Wrap calls in circuit breaker for resilience. Transform requests/responses as needed. Alternative approaches include HTTP proxy middleware for simpler forwarding or service mesh for infrastructure-level routing. Choose based on complexity and control requirements.

---

### Centralized JWT Validation

**What:** Validate JWT tokens at gateway instead of each service

**Benefits:**
- **Single Source of Truth:** One place for auth logic
- **Reduced Code Duplication:** Services don't need auth middleware
- **Performance:** Validate once at gateway, not per service
- **Security:** Expired/invalid tokens blocked before reaching services
- **Simplified Services:** Backend services trust gateway

**Implementation:**
```javascript
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;  // Attach user to request
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};
```

**Request Flow:**
```
1. Client sends request with Bearer token
2. Gateway extracts and validates token
3. If valid → Forward to backend with user context
4. If invalid → Return 403 immediately
5. Backend services trust gateway (no re-validation)
```

**Service-to-Service Communication:**
- Gateway adds `X-User-Id` header from decoded token
- Backend services use header instead of token validation
- Assumes internal network is trusted

**Trade-offs:**
- ✅ Centralized security logic
- ✅ Better performance (validate once)
- ✅ Simplified services
- ❌ Gateway must be trusted by all services
- ❌ Services can't validate tokens independently

**Interview Question:** "Should you validate JWT tokens at API Gateway or individual services?"
**Answer:** Validate at gateway for centralized security and performance. Services receive user context from trusted headers. This works when gateway and services are in same trust boundary. For zero-trust architecture, services should re-validate. Trade-off is between simplicity and defense-in-depth.

---

### Request/Response Logging

**What:** Log all requests through gateway for monitoring and debugging

**Our Implementation:**
```javascript
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('API Gateway Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  
  next();
});
```

**What to Log:**
- **Request:** Method, path, IP, user ID (if authenticated)
- **Response:** Status code, duration
- **Errors:** Full error details, stack traces

**What NOT to Log:**
- ❌ Sensitive data (passwords, credit cards)
- ❌ Full request/response bodies (too large)
- ❌ PII without proper anonymization

**Log Aggregation:**
- Send logs to centralized system (ELK stack, CloudWatch)
- Enable searching and alerting
- Create dashboards for monitoring

**Interview Question:** "What should you log in an API Gateway?"
**Answer:** Log request metadata (method, path, IP), response status, duration, and errors. Don't log sensitive data or full bodies. Use structured logging (JSON) for easy parsing. Send to centralized log aggregation for monitoring and alerting. Gateway logging provides single view of all API traffic.

---

### Graceful Degradation in Gateway

**What:** Continue operating when backend services fail

**Strategies:**

**1. Circuit Breaker (Fail Fast):**
```javascript
try {
  const data = await callWithCircuitBreaker('order-service', url, options);
  return data;
} catch (error) {
  if (error.message === 'Breaker is open') {
    return res.status(503).json({
      success: false,
      message: 'Order service temporarily unavailable'
    });
  }
}
```

**2. Fallback Responses:**
```javascript
// Return cached data if service is down
if (circuitOpen) {
  const cached = await cache.get(`fallback:${key}`);
  if (cached) {
    return res.json({ ...cached, source: 'cache-fallback' });
  }
}
```

**3. Partial Responses:**
```javascript
// If restaurant service down, still return orders without restaurant details
const orders = await orderService.getOrders();
// Skip restaurant enrichment if service unavailable
return orders;
```

**4. Health Check Aggregation:**
```javascript
const services = ['user', 'restaurant', 'order'];
const health = await Promise.allSettled(
  services.map(svc => checkHealth(svc))
);

// Return overall health even if some services down
return {
  status: allHealthy ? 'healthy' : 'degraded',
  services: health
};
```

**Interview Question:** "How do you handle backend service failures in API Gateway?"
**Answer:** Use circuit breaker to fail fast and prevent cascading failures. Return appropriate error responses (503 Service Unavailable). Consider fallback strategies like cached data or partial responses. Aggregate health checks to show degraded state. Always prefer degraded service over complete failure.

---

## Design Patterns Reference

### Cache-Aside Pattern Implementation

**Code Flow:**
```javascript
// 1. Check cache
const cached = await cache.get(key);
if (cached) return cached;

// 2. Query database
const data = await Database.find(query);

// 3. Populate cache
await cache.set(key, data, TTL);

// 4. Return data
return data;
```

**Used in:** Restaurant get/list/search operations

---

### Repository Pattern (Future)

**Current:** Controllers directly access database
**Future:** Add repository layer for cleaner architecture

```javascript
// Future improvement
class RestaurantRepository {
  async findById(id) {
    // Cache logic here
    // Database logic here
  }
}
```

---

### API Gateway Pattern (DAY 4)

**Pattern:** Single entry point routing to multiple backend services

**Implementation:**
```javascript
// Gateway routes requests with middleware
app.use('/api/users', authLimiter, userRoutes);
app.use('/api/restaurants', generalLimiter, restaurantRoutes);
app.use('/api/orders', authenticateToken, writeLimiter, orderRoutes);

// Each route uses circuit breaker
const data = await callWithCircuitBreaker('service-name', url, options);
```

**Used in:** All client-facing API requests

---

### Circuit Breaker Pattern (DAY 4)

**Pattern:** Fail fast when service is unhealthy, auto-recover when healthy

**State Machine:**
- CLOSED → Normal operation
- OPEN → Failing fast (service down)
- HALF_OPEN → Testing recovery

**Implementation:**
```javascript
const breaker = new CircuitBreaker(httpCall, {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});
```

**Used in:** All API Gateway → Backend Service calls

---

### Rate Limiting Pattern (DAY 4)

**Pattern:** Sliding window rate limiting per IP address

**Tiers:**
- General: 100 req/15min (browsing)
- Auth: 5 req/15min (login/register)
- Write: 20 req/min (create/update/delete)

**Implementation:**
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true
});
```

**Used in:** All API Gateway endpoints

---

## DAY 5: Driver Service & Geospatial Queries

### MongoDB Geospatial Indexing

**What:** Special indexes that enable location-based queries

**GeoJSON Format (Required):**
```javascript
{
  type: 'Point',
  coordinates: [longitude, latitude]  // Order matters! Longitude first
}
```

**Why GeoJSON:**
- Standard format for geographic data
- Supported by MongoDB, PostgreSQL (PostGIS), Elasticsearch
- Enables complex geospatial queries
- Works with map libraries (Leaflet, Google Maps)

**2dsphere Index:**
```javascript
driverSchema.index({ currentLocation: '2dsphere' });
```

**What it enables:**
- **$near:** Find nearest documents sorted by distance
- **$geoWithin:** Find documents within a shape (polygon, circle)
- **$geoIntersects:** Find documents that intersect a geometry

**Interview Question:** "How do you find the nearest driver to a customer?"
**Answer:** Use MongoDB's $near operator with 2dsphere index. Store location as GeoJSON Point [longitude, latitude]. The query returns results sorted by distance automatically. Set $maxDistance to limit search radius. Index makes query O(log n) instead of O(n).

---

### Geospatial Query: Find Nearby Drivers

**Implementation:**
```javascript
driverSchema.statics.findNearby = function(longitude, latitude, maxDistanceKm = 5, limit = 10) {
  return this.find({
    status: 'available',
    isActive: true,
    currentLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistanceKm * 1000 // Convert km to meters
      }
    }
  })
  .limit(limit)
  .select('name phone vehicle currentLocation metrics.rating');
};
```

**How it works:**
1. MongoDB uses 2dsphere index to quickly find nearby points
2. Results automatically sorted by distance (closest first)
3. $maxDistance filters out drivers too far away
4. Compound index on `status + location` optimizes the query further

**Distance Calculation:**
- MongoDB uses spherical geometry (Earth's curvature)
- Distance in meters (need to convert km → meters)
- More accurate than flat 2D calculations for large distances

**Performance:**
- With index: O(log n) + k where k = results returned
- Without index: O(n) - scans all documents
- Critical for real-time driver assignment

**Interview Question:** "What's the difference between 2d and 2dsphere indexes?"
**Answer:** 2d index for flat geometry (e.g., game maps, floor plans). 2dsphere for Earth's spherical surface (real-world locations). 2dsphere uses GeoJSON and accounts for Earth's curvature. For food delivery, always use 2dsphere.

---

### Location History & Bounded Arrays

**Problem:** Driver sends location updates every 10-30 seconds. Storing all creates unbounded growth.

**Solution:** Bounded array with slice
```javascript
this.locationHistory.push({
  location: { type: 'Point', coordinates: [longitude, latitude] },
  timestamp: new Date()
});

// Keep only last 100 locations
if (this.locationHistory.length > 100) {
  this.locationHistory = this.locationHistory.slice(-100);
}
```

**Why This Matters:**
- Prevents document from growing infinitely
- MongoDB has 16MB document size limit
- 100 locations ≈ 1-2 hours of tracking (at 30s intervals)
- Enough for debugging, analytics without bloat

**Alternative Approaches:**
1. **Separate collection:** Store history in separate `location_history` collection
   - Pros: Unbounded, can store forever, easier to query
   - Cons: Extra collection, need to manage cleanup
   
2. **Capped collection:** MongoDB capped collections auto-delete old data
   - Pros: Automatic cleanup, fixed size
   - Cons: Can't delete specific documents, all or nothing

3. **Time-series collection:** MongoDB 5.0+ time-series collections
   - Pros: Optimized for time-based data, compression
   - Cons: Requires MongoDB 5.0+, different query syntax

**Our Choice:** Bounded array in driver document
- Simple, no extra collection
- Fast reads (single document)
- Good for recent history only

**Interview Question:** "How do you handle unbounded array growth in MongoDB?"
**Answer:** Three approaches: (1) Bounded array with slice to keep last N items, (2) Separate collection with TTL index for auto-cleanup, (3) Time-series collection for optimized storage. Choose based on retention needs and query patterns. For recent history, bounded array is simplest.

---

### Driver Assignment Algorithm

**Requirement:** Assign nearest available driver to new order

**Simple Approach (Our Implementation):**
```javascript
// 1. Find drivers near restaurant (5km radius)
const drivers = await Driver.findNearby(
  restaurant.longitude,
  restaurant.latitude,
  5, // maxDistance in km
  10 // limit
);

// 2. Pick first available driver (closest)
const driver = drivers[0];

// 3. Assign order
await driver.assignOrder(orderId);
```

**Why This Works:**
- $near automatically sorts by distance
- First result = closest driver
- Simple, fast, good enough for most cases

**Production Enhancements:**

**1. Consider Driver Rating:**
```javascript
// Sort by distance AND rating
drivers.sort((a, b) => {
  // Weighted score: 70% distance, 30% rating
  const scoreA = (a.distance * 0.7) + ((5 - a.rating) * 0.3);
  const scoreB = (b.distance * 0.7) + ((5 - b.rating) * 0.3);
  return scoreA - scoreB;
});
```

**2. Consider Current Location + Destination:**
- Calculate total trip distance
- Driver → Restaurant → Customer
- Optimizes for faster delivery, not just pickup

**3. Load Balancing:**
- Track deliveries per driver today
- Prefer drivers with fewer deliveries
- Ensures fair distribution of earnings

**4. Estimated Time of Arrival (ETA):**
- Use routing API (Google Maps, Mapbox)
- Consider traffic conditions
- More accurate than straight-line distance

**Trade-offs:**
- **Simple (distance only):** Fast, easy to understand, good for small areas
- **Complex (multiple factors):** Better assignments, slower computation, harder to debug

**Interview Question:** "How would you improve a simple nearest-driver assignment?"
**Answer:** Consider multiple factors: (1) Driver rating for quality, (2) Current load for fairness, (3) Traffic-aware ETA for accuracy, (4) Total trip distance (driver→restaurant→customer) for efficiency. Use weighted scoring. Cache routing calculations. Monitor for bias. Balance speed vs quality.

---

## DAY 5: Notification Service & Event Consumers

### RabbitMQ Consumer Pattern

**What:** Service that listens to events from RabbitMQ queue

**Publisher (Order Service):**
```javascript
// Publishes event to topic exchange
await channel.publish('quickbite.events', 'order.created', event);
```

**Consumer (Notification Service):**
```javascript
// Subscribes to all order.* events
await channel.assertQueue('notification.orders', { durable: true });
await channel.bindQueue('notification.orders', 'quickbite.events', 'order.*');
await channel.consume('notification.orders', handleMessage);
```

**Key Concepts:**

**1. Durable Queues:**
- Queue survives RabbitMQ restart
- Messages persisted to disk
- Critical for production

**2. Message Acknowledgment:**
```javascript
// Manual ack - message removed only after processing
channel.consume(queue, async (msg) => {
  try {
    await processMessage(msg);
    channel.ack(msg); // Success - remove from queue
  } catch (error) {
    channel.nack(msg, false, false); // Failure - send to DLQ
  }
});
```

**3. Prefetch Limit:**
```javascript
await channel.prefetch(1); // Process 1 message at a time
```
- Prevents overwhelming the service
- Ensures fair distribution across consumers
- Critical for rate limiting

**Interview Question:** "What's the difference between ack and nack in RabbitMQ?"
**Answer:** `ack` (acknowledge) tells RabbitMQ message was processed successfully - remove from queue. `nack` (negative acknowledge) indicates failure. Parameters: requeue (true = back to queue, false = send to DLQ), multiple (ack multiple messages). For idempotent operations, use requeue=true. For errors that won't fix on retry, use requeue=false with dead letter queue.

---

### At-Least-Once Delivery Guarantee

**Guarantee:** Message delivered at least once, possibly more

**How it works:**
1. Message sent to queue
2. Consumer receives message
3. Consumer processes message
4. Consumer sends ack
5. Queue removes message

**If consumer crashes after step 3 (before ack):**
- Message re-delivered to another consumer
- Same message processed twice
- **Not exactly-once!**

**Implications:**
- **Operations must be idempotent**
- Sending same email twice = annoying but ok
- Charging credit card twice = disaster

**Making Operations Idempotent:**

**1. Idempotency Key:**
```javascript
await sendEmail({
  to: user.email,
  subject: 'Order Confirmed',
  body: '...',
  idempotencyKey: `order-${orderId}-confirmed` // Unique key
});

// Email service checks: already sent this key? Skip.
```

**2. Database Deduplication:**
```javascript
// Store processed event IDs
await ProcessedEvent.findOneAndUpdate(
  { eventId: msg.properties.messageId },
  { processed: true },
  { upsert: true }
);
```

**3. Idempotent by Design:**
- Setting status to "CONFIRMED" twice = same result
- Incrementing counter twice = wrong result (not idempotent)

**Interview Question:** "How do you handle duplicate messages in event-driven systems?"
**Answer:** Ensure operations are idempotent. Methods: (1) Idempotency keys to detect duplicates, (2) Store processed message IDs in database, (3) Design operations to be naturally idempotent (SET vs INCREMENT). For notifications, deduplication window (e.g., last 24 hours) prevents spam. For financial operations, strict idempotency required.

---

### Dead Letter Queue (DLQ) Pattern

**Problem:** What if message processing keeps failing?

**Solution:** Dead Letter Queue
```javascript
await channel.assertQueue('notification.orders', {
  durable: true,
  arguments: {
    'x-dead-letter-exchange': 'quickbite.dlx',
    'x-dead-letter-routing-key': 'notification.failed'
  }
});
```

**How it works:**
1. Message fails processing
2. Consumer sends nack with requeue=false
3. RabbitMQ moves message to DLQ
4. Separate process handles DLQ messages

**DLQ Message Handling:**
- **Manual inspection:** Review why messages failed
- **Retry with backoff:** Attempt reprocessing after delay
- **Alert:** Notify team of failures
- **Discard:** After X attempts, give up

**Why This Matters:**
- Prevents poison messages from blocking queue
- Enables failure analysis and debugging
- Keeps main queue healthy

**Production Best Practices:**
1. Monitor DLQ size (alert if growing)
2. TTL on DLQ messages (auto-delete after 7 days)
3. Separate DLQ per queue for isolation
4. Log full context when sending to DLQ

**Interview Question:** "What is a dead letter queue and when would you use it?"
**Answer:** DLQ stores messages that fail processing repeatedly. Prevents poison messages from blocking queue. Configure with x-dead-letter-exchange. Messages sent to DLQ after nack(requeue=false). Use for: failed API calls, invalid data, external service outages. Monitor DLQ size. Implement retry logic with exponential backoff. After N retries, alert team for manual intervention.

---

### Multi-Channel Notification Design

**Channels:**
1. **Email:** Detailed information, receipts
2. **SMS:** Time-sensitive alerts
3. **Push:** Real-time updates in app
4. **In-App:** Notification center

**Channel Selection Logic:**
```javascript
// User preferences
if (user.email && user.emailOptIn) {
  await sendEmail(...);
}

if (user.phone && user.smsOptIn) {
  await sendSMS(...);  
}

if (user.deviceToken) {
  await sendPush(...);
}
```

**Template System:**
```javascript
const templates = {
  'order.created': {
    subject: 'Order Confirmed - #{orderNumber}',
    body: 'Hi {customerName}, your order #{orderNumber} has been placed...',
    sms: 'Order #{orderNumber} confirmed. Total: ${total}',
    push: { title: 'Order Placed!', body: 'Order #{orderNumber} confirmed' }
  }
};

function renderTemplate(template, data) {
  return template.replace(/{(\w+)}/g, (match, key) => data[key] || '');
}
```

**Best Practices:**

**1. Respect User Preferences:**
- Opt-in for marketing
- Opt-out for transactional (with legal limits)
- Separate preferences per channel

**2. Rate Limiting:**
- Max N notifications per day
- Batch similar notifications
- Quiet hours (no SMS at 3am)

**3. Fallback Strategy:**
```javascript
try {
  await sendPush(user);
} catch (error) {
  // Fallback to SMS if push fails
  await sendSMS(user);
}
```

**4. Delivery Tracking:**
- Track sent/delivered/opened
- Retry failed sends
- Analyze engagement rates

**Interview Question:** "How do you design a multi-channel notification system?"
**Answer:** Separate channels (email, SMS, push) with user preferences. Template system for consistent messaging across channels. Event-driven with RabbitMQ consumer. Respect opt-in/out, implement rate limiting, quiet hours. Track delivery status. Fallback chain (push→SMS→email). Idempotent to handle retries. Monitor costs (SMS expensive). Consider urgency (push for urgent, email for detailed).

---

## Interview Preparation Summary

### Key Topics Covered

1. **Microservices Architecture**
   - Database-per-service pattern
   - Service isolation and independence
   - Stateless authentication
   - Inter-service communication (sync/async)

2. **Caching Strategies**
   - Cache-aside pattern
   - TTL strategies
   - Cache invalidation
   - Thundering herd problem

3. **Database Design**
   - Embedded vs referenced documents (MongoDB)
   - Indexing strategies (text, geospatial, compound)
   - Read-heavy vs write-heavy optimization
   - 2dsphere indexes for location queries

4. **Event-Driven Architecture**
   - Event sourcing basics
   - RabbitMQ pub/sub with topic exchanges
   - At-least-once delivery guarantees
   - Idempotency and deduplication
   - Dead letter queues

5. **Resilience Patterns**
   - Circuit breaker (fail fast, auto-recovery)
   - Rate limiting (multi-tier strategy)
   - Graceful degradation
   - Request timeout and retry logic
   - Health checks

6. **API Gateway Pattern**
   - Centralized routing and authentication
   - Cross-cutting concerns (logging, rate limiting)
   - Service abstraction
   - Backend service protection

7. **Geospatial Systems**
   - GeoJSON format and 2dsphere indexes
   - Location-based queries with $near
   - Driver assignment algorithms
   - Location history management

8. **Notification Systems**
   - Multi-channel delivery (email, SMS, push)
   - Event-driven notifications
   - Template systems
   - User preferences and opt-in/out

### Common Interview Questions

**Q1: "Why use microservices instead of monolith?"**

**A:** Microservices offer:
- **Independent Scaling:** Scale order service separately during peak hours
- **Technology Diversity:** Use MongoDB for orders, Redis for caching
- **Team Autonomy:** Different teams own different services
- **Fault Isolation:** If restaurant service fails, users can still place orders
- **Faster Deployment:** Deploy one service without affecting others

**Trade-offs:** Increased complexity (distributed systems), network latency, eventual consistency, harder debugging

---

**Q2: "How do you ensure data consistency across microservices?"**

**A:** Multiple approaches:
1. **Eventual Consistency with Events:** Order Service publishes event → Notification Service consumes → Eventually consistent
2. **Saga Pattern:** Coordinate distributed transactions with compensating actions
3. **Two-Phase Commit:** Synchronous, slow, avoid if possible
4. **Idempotent Operations:** Design for retries
5. **Database-per-Service:** Each service owns its data, no shared databases

**Our Implementation:** Eventual consistency with RabbitMQ events. Order created → Event published → Notification sent. Acceptable delay for notifications.

---

**Q3: "What's the difference between API Gateway and reverse proxy?"**

**A:**
- **Reverse Proxy (Nginx):** Routes traffic, SSL termination, load balancing, caching
- **API Gateway:** All of above PLUS authentication, rate limiting, request transformation, circuit breaking, aggregation

**API Gateway = Smart Reverse Proxy**

**Example:** In QuickBite, API Gateway checks JWT, enforces rate limits, applies circuit breaker, then routes to backend service. Nginx would just route.

---

**Q4: "How do you handle service failures?"**

**A:** Multiple strategies:
1. **Circuit Breaker:** Stop calling failing service, return cached/default response
2. **Retry with Backoff:** Retry failed requests with exponential delays
3. **Timeout:** Don't wait forever, fail fast
4. **Fallback:** Return cached data or degraded response
5. **Health Checks:** Remove unhealthy instances from load balancer

**Our Implementation:** Circuit breaker in API Gateway. After 5 failures, open circuit for 60s. Return cached restaurant data if available.

---

**Q5: "Why use Redis for caching?"**

**A:** Redis advantages:
- **In-Memory:** Extremely fast (sub-millisecond)
- **Data Structures:** Strings, hashes, lists, sets (not just key-value)
- **Persistence:** Optional disk persistence
- **TTL:** Automatic expiration
- **Pub/Sub:** Real-time messaging

**Alternatives:**
- **Memcached:** Simpler, only key-value, no persistence
- **In-Process Cache (Node Cache):** Fast but not shared across instances

**Our Use Case:** Cache restaurant listings (expensive DB query, rarely changes). TTL 5 minutes. Invalidate on update.

---

**Q6: "How do you secure microservices?"**

**A:** Multiple layers:
1. **Authentication:** JWT tokens, verify on API Gateway
2. **Authorization:** Role-based access control (RBAC)
3. **Network Security:** Private network, no direct access to services
4. **Rate Limiting:** Prevent abuse, DDoS protection
5. **Input Validation:** Sanitize all inputs, prevent injection
6. **HTTPS/TLS:** Encrypt traffic between services
7. **Secrets Management:** Environment variables, never hardcode

**Our Implementation:** JWT on API Gateway, role checks in services, rate limiting per IP, Helmet.js security headers, CORS restrictions.

---

**Q7: "How would you debug a slow API endpoint?"**

**A:** Systematic approach:
1. **Reproduce:** Confirm issue, measure baseline (response time, throughput)
2. **Add Logging:** Time each step (DB query, external API, processing)
3. **Database:** Check slow queries (explain plan), missing indexes
4. **Network:** Measure latency between services
5. **Code:** Profile CPU, memory, async operations
6. **External Services:** Check third-party API response times
7. **Load:** Is it slow under load only? (connection pooling, memory leaks)

**Tools:** Application Performance Monitoring (APM), distributed tracing (Jaeger), database query logs, Node.js profiler

**Common Culprits:** N+1 queries, missing indexes, blocking operations on event loop, no connection pooling

---

**Q8: "Explain your event-driven architecture design."**

**A:** 
**Components:**
- **Publisher:** Order Service publishes events to RabbitMQ (order.created, order.confirmed, etc.)
- **Exchange:** Topic exchange routes events based on routing key pattern (order.*)
- **Queue:** Durable queue per consumer (notification.orders)
- **Consumer:** Notification Service subscribes to queue, processes events

**Flow:**
1. User places order → Order Service saves to DB
2. Order Service publishes 'order.created' event to exchange
3. Exchange routes to bound queues (notification.orders)
4. Notification Service receives message, sends email/SMS/push
5. Consumer sends ack to RabbitMQ (message removed from queue)

**Benefits:**
- **Decoupling:** Services don't know about each other
- **Scalability:** Add consumers to handle load
- **Reliability:** Messages persist in queue if consumer down

**Guarantees:** At-least-once delivery (idempotency required)

---

**Q9: "How do you find the nearest driver to a customer?"**

**A:**
**Technical Implementation:**
- Store driver location as GeoJSON Point [longitude, latitude]
- Create 2dsphere index on currentLocation field
- Query with $near operator and $maxDistance (e.g., 5km)
- Results automatically sorted by distance

```javascript
Driver.find({
  status: 'available',
  currentLocation: {
    $near: {
      $geometry: { type: 'Point', coordinates: [lon, lat] },
      $maxDistance: 5000 // 5km in meters
    }
  }
}).limit(10);
```

**Performance:** O(log n) with index vs O(n) without

**Enhancements:**
- Consider driver rating (weighted score)
- Calculate full trip distance (driver→restaurant→customer)
- Traffic-aware ETA using routing API
- Load balancing (deliveries per driver)

---

**Q10: "How do you ensure notifications are not sent twice?"**

**A:**
**Problem:** RabbitMQ provides at-least-once delivery. If consumer crashes after processing but before ack, message redelivered.

**Solutions:**
1. **Idempotency Key:** Include unique key in message (orderId + eventType)
   ```javascript
   const key = `${orderId}-${eventType}`;
   if (await alreadyProcessed(key)) return; // Skip duplicate
   await sendNotification(...);
   await markProcessed(key);
   ```

2. **Database Deduplication:** Store processed message IDs
   ```javascript
   await ProcessedEvent.findOneAndUpdate(
     { messageId: msg.properties.messageId },
     { processed: true },
     { upsert: true }
   );
   ```

3. **Idempotent Operations:** Design operations to be naturally idempotent
   - Setting order status to "CONFIRMED" multiple times = same result ✓
   - Incrementing counter multiple times = wrong result ✗

4. **Deduplication Window:** Track processed events for 24-48 hours, then cleanup

**Our Approach:** Combination of idempotency keys and time-window deduplication for notifications.

---

**Q11: "How would you scale this system to handle 10x traffic?"**

**A:**
**Horizontal Scaling:**
- Add more instances of each service behind load balancer
- Stateless services scale linearly

**Database:**
- **MongoDB:** Sharding (partition by restaurantId, userId)
- **Redis:** Redis Cluster for distributed caching
- Read replicas for read-heavy services (Restaurant)

**Message Broker:**
- RabbitMQ clustering or use managed service (AWS SQS, Google Pub/Sub)
- Multiple consumers per queue for parallel processing

**Caching:**
- Add CDN for static assets (images, CSS, JS)
- Edge caching for API responses (Cloudflare, AWS CloudFront)
- Increase Redis cache TTL for stable data

**Database Optimization:**
- Analyze slow queries, add compound indexes
- Denormalize frequently joined data
- Use database connection pooling

**Asynchronous Processing:**
- Move non-critical operations to background jobs
- Use worker queues for heavy processing

**Monitoring:**
- APM tools (New Relic, Datadog)
- Auto-scaling based on CPU/memory/request rate
- Alerting for errors, slow queries, queue depth

**Bottlenecks to Watch:**
- Database connections (pool size)
- RabbitMQ throughput (upgrade plan or self-host cluster)
- External API rate limits (batch requests, cache responses)

---

**Q12: "Explain the circuit breaker pattern with a real example."**

**A:**
**Problem:** Restaurant Service is down. Every request to API Gateway tries to call it, waits for timeout (5s), fails. Wastes resources, slow responses.

**Circuit Breaker Solution:**
- **Closed State:** Requests pass through normally
- **Open State:** After N failures (e.g., 5), open circuit → immediately return error/cached data
- **Half-Open State:** After timeout (e.g., 60s), allow 1 test request. If succeeds → close circuit. If fails → stay open.

**Implementation:**
```javascript
if (circuitBreaker.isOpen('restaurant-service')) {
  return res.json({ 
    restaurants: cachedRestaurants, 
    cached: true 
  });
}

try {
  const response = await axios.get(RESTAURANT_SERVICE_URL);
  circuitBreaker.recordSuccess('restaurant-service');
  return response.data;
} catch (error) {
  circuitBreaker.recordFailure('restaurant-service');
  if (circuitBreaker.shouldOpen('restaurant-service')) {
    circuitBreaker.open('restaurant-service', 60000); // 60s
  }
  throw error;
}
```

**Benefits:**
- Fail fast (no waiting for timeout)
- Reduce load on failing service (give it time to recover)
- Graceful degradation (return cached data)

**Real-World Example:** During restaurant service deployment, circuit opens for 60s. Users see cached restaurant list instead of errors. Service recovers, circuit closes, normal operation resumes.

---

## Design Patterns Deep Dive

### 1. Microservices Architecture Pattern

**Pattern:** Decompose application into small, independent services that communicate via APIs

**Our Implementation:**
- 6 services: User, Restaurant, Order, Driver, Notification, API Gateway
- Each service has dedicated database (database-per-service)
- Communication via HTTP (sync) and RabbitMQ (async)

**Benefits:**
- **Independent Scaling:** Scale order service 10x during lunch rush without touching user service
- **Technology Diversity:** Could use Python for ML-based recommendations, Go for high-performance services
- **Team Autonomy:** Frontend team, backend team, mobile team work independently
- **Fault Isolation:** Restaurant service crash doesn't affect order history viewing
- **Faster Deployment:** Deploy notification service without restarting gateway
- **Easier Testing:** Test user service in isolation

**Drawbacks:**
- **Complexity:** 6 services vs 1 monolith = more moving parts
- **Network Latency:** Each API call adds 5-20ms overhead
- **Eventual Consistency:** User updates might not immediately reflect in orders
- **Distributed Debugging:** Error spans multiple services, need distributed tracing
- **Testing Challenges:** Integration tests require all services running
- **Operational Overhead:** 6 deployments, 6 monitoring dashboards, 6 log streams

**When to Use Microservices:**
- ✅ Large application (>100k LOC)
- ✅ Multiple teams (>10 developers)
- ✅ Different scaling needs per component
- ✅ Can accept eventual consistency
- ✅ Have DevOps resources for orchestration

**When to Avoid (Use Monolith):**
- ❌ Small team (<5 developers)
- ❌ Early-stage startup (need speed to market)
- ❌ Simple CRUD application
- ❌ Strong consistency required everywhere
- ❌ Limited DevOps expertise

**QuickBite Decision:** Microservices for learning/portfolio. In real startup, I'd start monolith, split later based on actual bottlenecks.

---

### 2. Database-per-Service Pattern

**Pattern:** Each microservice owns its database, no shared databases

**Our Implementation:**
```
User Service      → user_service DB (users, profiles)
Restaurant Service → restaurant_service DB (restaurants, menus)
Order Service     → order_service DB (orders, order_items)
Driver Service    → driver_service DB (drivers, locations)
```

**Benefits:**
- **Service Independence:** Change user schema without coordinating with order team
- **Technology Choice:** MongoDB for geospatial (drivers), PostgreSQL for analytics (later)
- **Fault Isolation:** Restaurant DB crash doesn't affect user logins
- **Scalability:** Shard order DB by userId, restaurant DB by location

**Drawbacks:**
- **No JOINs:** Can't join orders with restaurants in SQL
- **Data Duplication:** Order stores restaurantId but not full restaurant details
- **Eventual Consistency:** Restaurant name change takes time to propagate
- **Distributed Transactions:** Need Saga pattern for multi-DB updates

**Handling Cross-Service Data:**

**Approach 1: API Calls (Synchronous)**
```javascript
// Order service needs restaurant name
const order = await Order.findById(orderId);
const restaurant = await axios.get(`${RESTAURANT_SERVICE}/api/restaurants/${order.restaurantId}`);
```
**Pros:** Always fresh data
**Cons:** Latency (extra network call), coupling (service dependency), failure propagation

**Approach 2: Events (Asynchronous)**
```javascript
// Restaurant publishes "restaurant.updated" event
// Order service consumes and updates local cache
restaurantCache.set(restaurantId, { name, address });
```
**Pros:** Decoupled, fast reads (local cache), resilient
**Cons:** Eventual consistency, stale data possible, cache management complexity

**Approach 3: Data Duplication**
```javascript
// Store denormalized data in order
order.restaurant = {
  name: restaurant.name,
  address: restaurant.address,
  phone: restaurant.phone
};
```
**Pros:** No dependencies, fast reads, works offline
**Cons:** Stale data (restaurant renamed), storage overhead, sync complexity

**QuickBite Approach:** Hybrid
- Store only IDs in order (normalized)
- Fetch full details via API Gateway (with caching)
- Accept eventual consistency for non-critical data

**Alternative: Shared Database (Anti-pattern)**
```javascript
// ❌ All services connect to same DB
User Service ────┐
Restaurant Service├─→ shared_db
Order Service ────┘
```
**Why Avoid:**
- Tight coupling (schema change breaks all services)
- Single point of failure (DB down = all services down)
- Can't scale independently
- Defeats purpose of microservices

---

### 3. API Gateway Pattern

**Pattern:** Single entry point for all client requests, handles cross-cutting concerns

**Our Implementation:**
```
Client → API Gateway (3000) → Backend Services (3001-3005)
         │
         ├─ JWT Validation
         ├─ Rate Limiting
         ├─ Circuit Breaker
         ├─ Request Logging
         └─ Response Transformation
```

**Responsibilities:**
1. **Routing:** `/api/users/*` → User Service, `/api/orders/*` → Order Service
2. **Authentication:** Validate JWT once, pass userId to backend
3. **Rate Limiting:** 100 req/15min general, 5 req/15min auth endpoints
4. **Circuit Breaking:** Fail fast when backend down
5. **Aggregation:** Single request → multiple backend calls → combined response
6. **Protocol Translation:** REST to gRPC, HTTP to WebSocket
7. **Logging:** Centralized request/response logging

**Benefits:**
- **Simplified Clients:** One endpoint instead of 6
- **Security:** Centralized auth, no tokens exposed to services
- **Flexibility:** Change backend without updating clients
- **Monitoring:** Single place for metrics
- **Performance:** Response caching at gateway level

**Drawbacks:**
- **Single Point of Failure:** Gateway down = entire API down
  - *Mitigation:* Run 3+ instances behind load balancer
- **Latency:** Extra hop adds ~10ms
  - *Acceptable:* Security/convenience worth cost
- **Bottleneck:** High traffic overwhelms gateway
  - *Mitigation:* Horizontal scaling (stateless design)
- **Complexity:** Another service to maintain
  - *Trade-off:* Centralized logic vs distributed

**Gateway Types:**

**Custom (Our Choice):**
- Built with Express.js
- Full control over logic
- Easy to add custom middleware
- Same stack as services

**Nginx (Reverse Proxy):**
- Battle-tested, high performance
- Limited to routing, SSL, caching
- No custom business logic

**Kong (Enterprise Gateway):**
- Plugin ecosystem (auth, rate limiting, etc.)
- Complex setup, heavy
- Overkill for small projects

**AWS API Gateway (Managed):**
- Fully managed, auto-scaling
- Pay-per-request, can get expensive
- Vendor lock-in

**QuickBite Decision:** Custom gateway for learning and flexibility. Production might use Kong or AWS API Gateway.

---

### 4. Event-Driven Architecture Pattern

**Pattern:** Services communicate via asynchronous events instead of direct calls

**Our Implementation:**
```
Order Service → RabbitMQ (Exchange: quickbite.events) → Notification Service
                    ↓
              [Topic: order.*]
```

**Event Flow:**
1. User places order
2. Order Service saves to DB
3. Order Service publishes `order.created` event
4. RabbitMQ routes to notification queue
5. Notification Service consumes event
6. Sends email/SMS/push notification
7. Acks message (removed from queue)

**Event Types:**
- `order.created` - New order placed
- `order.confirmed` - Restaurant accepted
- `order.preparing` - Cooking started
- `order.ready` - Ready for pickup
- `order.out_for_delivery` - Driver picked up
- `order.delivered` - Delivered to customer
- `order.cancelled` - Order cancelled

**Benefits:**
- **Decoupling:** Order service doesn't know about notification service
- **Scalability:** Add analytics service without changing order service
- **Resilience:** Messages persist if consumer down
- **Async:** Non-blocking, better performance
- **Audit Trail:** Events provide history of what happened
- **Temporal Decoupling:** Producer and consumer don't need to be online simultaneously

**Drawbacks:**
- **Complexity:** Harder to debug (distributed tracing needed)
- **Eventual Consistency:** Notification arrives seconds after order
- **Message Ordering:** Hard to guarantee strict order
- **Duplicate Messages:** At-least-once delivery requires idempotency
- **Event Schema:** Need versioning strategy for breaking changes

**Delivery Guarantees:**

| Type | Meaning | Implementation | Use Case |
|------|---------|----------------|----------|
| **At-most-once** | Send once, might lose | Fire-and-forget | Metrics, logs (lossy OK) |
| **At-least-once** | Retry until ack, duplicates possible | RabbitMQ default | Notifications (idempotent) |
| **Exactly-once** | Deliver exactly once | Distributed transactions | Payments (critical) |

**QuickBite Choice:** At-least-once + idempotent consumers

**Idempotency Implementation:**
```javascript
// Track processed messages in Redis
const key = `processed:${orderId}:${eventType}`;
if (await redis.get(key)) {
  logger.info('Duplicate event, skipping');
  return;
}

await sendNotification(...);
await redis.setex(key, 86400, 'processed'); // 24h TTL
```

**Alternative: Synchronous API Calls**
```javascript
// ❌ Order service directly calls notification service
await axios.post(`${NOTIFICATION_SERVICE}/send`, { orderId, type: 'created' });
```
**Problems:**
- Coupling (order service knows about notification)
- Blocking (wait for notification to send)
- Failure (notification down = order fails)
- Scaling (can't add services without code changes)

---

### 5. Circuit Breaker Pattern

**Pattern:** Prevent cascading failures by failing fast when downstream service is unhealthy

**States:**
```
CLOSED (Normal) → OPEN (Failing) → HALF_OPEN (Testing) → CLOSED
     ↓                ↑                    ↓
Error threshold    Timeout           Test success
```

**Our Implementation (Opossum library):**
```javascript
const breaker = new CircuitBreaker(restaurantServiceCall, {
  timeout: 5000,              // Fail if response takes >5s
  errorThresholdPercentage: 50, // Open at 50% error rate
  resetTimeout: 30000,        // Test recovery after 30s
  volumeThreshold: 5          // Need 5 requests before checking rate
});

breaker.fallback(() => {
  return { restaurants: cachedRestaurants, source: 'cache' };
});
```

**State Transitions:**

**CLOSED → OPEN:**
- 10 requests made
- 6 fail (60% > 50% threshold)
- Circuit opens
- Next requests fail immediately (no backend call)

**OPEN → HALF_OPEN:**
- 30 seconds pass (resetTimeout)
- Allow 1 test request through
- If succeeds → Close circuit
- If fails → Stay open another 30s

**Benefits:**
- **Fail Fast:** Return error/cached data immediately (no 5s timeout wait)
- **Reduce Load:** Stop hammering failing service (give it recovery time)
- **Better UX:** Instant error message vs hanging request
- **Cascading Prevention:** Failure contained, doesn't propagate

**Example Scenario:**
```
09:00:00 - Restaurant service deploys new version
09:00:05 - Deployment has bug, service returning 500 errors
09:00:10 - Gateway makes 5 requests, all timeout (5s each = 25s wasted)
09:00:35 - Error rate hits 50%, circuit opens
09:00:36 - Next 1000 requests fail instantly, return cached data
09:01:05 - Circuit half-opens, test request succeeds
09:01:06 - Circuit closes, normal operation
```

**Without Circuit Breaker:**
- All 1000 requests wait 5s timeout = 5000s total wasted
- Backend overwhelmed with requests
- Users see slow response times

**With Circuit Breaker:**
- First 5 requests timeout = 25s
- Next 995 requests fail instantly = ~1s total
- Backend gets recovery time
- Users see fast error/cached data

**When to Use:**
- ✅ External service calls (payment gateway, maps API)
- ✅ Microservice communication
- ✅ Database calls (if DB struggling)
- ✅ Anything with timeout potential

**When NOT to Use:**
- ❌ In-memory operations (no failure possible)
- ❌ Critical operations (can't skip, must succeed)
- ❌ Low-traffic endpoints (volumeThreshold never reached)

---

### 6. Cache-Aside Pattern

**Pattern:** Application checks cache before database, populates cache on miss

**Flow:**
```
1. Request arrives
2. Check cache
   → HIT: Return cached data
   → MISS: Continue to step 3
3. Query database
4. Store in cache (with TTL)
5. Return data
```

**Our Implementation:**
```javascript
async function getRestaurants(page) {
  const cacheKey = `restaurants:all:${page}`;
  
  // 1. Try cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return { data: JSON.parse(cached), source: 'cache' };
  }
  
  // 2. Query database
  const restaurants = await Restaurant.find()
    .skip((page - 1) * 20)
    .limit(20);
  
  // 3. Store in cache (5 min TTL)
  await redis.setex(cacheKey, 300, JSON.stringify(restaurants));
  
  // 4. Return
  return { data: restaurants, source: 'database' };
}
```

**Caching Strategies:**

**1. Time-to-Live (TTL)**
- Cache expires after N seconds
- Simple, works for most cases
- **QuickBite:** 5 min for lists, 10 min for details

**2. Write-Through**
- Update DB and cache together
- Always consistent
- **Downside:** Extra cache write overhead

**3. Write-Behind (Write-Back)**
- Update cache first, async update DB
- Fast writes
- **Danger:** Data loss if cache crashes

**4. Refresh-Ahead**
- Refresh cache before TTL expires
- No cache misses
- **Complexity:** Background job management

**Cache Invalidation:**

**Pattern-Based:**
```javascript
// Restaurant updated → delete all related caches
await redis.del(`restaurant:${id}`);
const keys = await redis.keys('restaurants:*');
await redis.del(...keys);
```

**Event-Based:**
```javascript
// Listen for restaurant.updated event
eventBus.on('restaurant.updated', async (restaurantId) => {
  await invalidateRestaurantCache(restaurantId);
});
```

**Cache Stampede (Thundering Herd):**

**Problem:**
```
Cache expires at 12:00:00
1000 requests arrive at 12:00:01
All see cache miss
All query database simultaneously
Database overloaded
```

**Solution 1: Lock-Based**
```javascript
const lock = await redis.setnx(`lock:${key}`, 1, 10); // 10s lock
if (lock) {
  // First request: fetch from DB and cache
  const data = await db.query();
  await redis.set(key, data, TTL);
  await redis.del(`lock:${key}`);
} else {
  // Other requests: wait and retry cache
  await sleep(100);
  return getFromCache(key);
}
```

**Solution 2: Probabilistic Early Expiration**
```javascript
const timeLeft = await redis.ttl(key);
const shouldRefresh = Math.random() < (1 / timeLeft);
if (shouldRefresh) {
  // Randomly refresh before TTL
  refreshCache(key);
}
```

---

### 7. State Machine Pattern

**Pattern:** Model business process as states and allowed transitions

**Our Order State Machine:**
```
PENDING → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED
    ↓          ↓           ↓          ↓            ↓
    └──────────┴───────────┴──────────┴────────────┴─→ CANCELLED
```

**Implementation:**
```javascript
const VALID_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],  // Terminal state
  CANCELLED: []   // Terminal state
};

function canTransition(currentState, newState) {
  return VALID_TRANSITIONS[currentState].includes(newState);
}

async function updateOrderStatus(orderId, newStatus) {
  const order = await Order.findById(orderId);
  
  if (!canTransition(order.status, newStatus)) {
    throw new Error(`Cannot transition from ${order.status} to ${newStatus}`);
  }
  
  order.status = newStatus;
  order.statusHistory.push({ status: newStatus, timestamp: new Date() });
  await order.save();
  
  // Emit event
  await publishEvent('order.' + newStatus.toLowerCase(), order);
}
```

**Benefits:**
- **Business Rules Enforced:** Can't deliver before preparing
- **Clear States:** No ambiguity (is "done" same as "delivered"?)
- **Audit Trail:** statusHistory shows all transitions
- **Event Generation:** Each transition triggers event
- **Testing:** Each transition is a test case

**Alternative: Simple Status Field**
```javascript
// ❌ No validation
order.status = 'DELIVERED'; // Even if currently PENDING!
```

**Problems:**
- No validation (can set any status)
- Easy to bypass business rules
- No transition history
- Harder to maintain

---

### 8. Repository Pattern

**Pattern:** Abstraction layer between business logic and data access

**Without Repository:**
```javascript
// ❌ Controller directly uses Mongoose
async function getRestaurant(req, res) {
  const restaurant = await Restaurant.findById(req.params.id)
    .populate('menu')
    .exec();
  res.json(restaurant);
}
```

**With Repository:**
```javascript
// Repository layer
class RestaurantRepository {
  async findById(id) {
    return Restaurant.findById(id).populate('menu').exec();
  }
  
  async findByLocation(lat, lng, radius) {
    return Restaurant.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radius
        }
      }
    });
  }
  
  async create(data) {
    return Restaurant.create(data);
  }
}

// Controller uses repository
async function getRestaurant(req, res) {
  const restaurant = await restaurantRepo.findById(req.params.id);
  res.json(restaurant);
}
```

**Benefits:**
- **Testability:** Mock repository in tests
- **Flexibility:** Switch from MongoDB to PostgreSQL without changing controllers
- **Reusability:** Same query logic across controllers
- **Separation:** Business logic separated from data access

**QuickBite:** We use Mongoose models directly (simpler for small project). Would use Repository pattern in larger production app.

---

## Scaling to Production (Uber Eats Scale)

### Current System Limitations

**Our Current Architecture:**
- 6 microservices running on single machine
- MongoDB single instance (no replication)
- Redis single instance (no clustering)
- RabbitMQ single instance
- No load balancing
- No auto-scaling
- No geographic distribution

**Handles:** ~1,000 orders/day, 10,000 users

**Uber Eats Scale:** ~100M orders/day, 100M users

**Required Changes:** Almost everything needs to scale 100,000x

---

### Phase 1: Horizontal Scaling (10x → 100x)

**Target:** 10,000 orders/day → 100,000 orders/day

**Changes:**

**1. Service Scaling**
```yaml
# Before: 1 instance per service
quickbite-order-service: 1 container

# After: Multiple instances behind load balancer
quickbite-order-service:
  replicas: 5
  load_balancer: nginx
```

**Implementation:**
- Kubernetes Deployment with replicas: 3-10 per service
- HorizontalPodAutoscaler (HPA) based on CPU/memory
- Health checks for automatic failover

**2. Database Scaling**

**MongoDB:**
```javascript
// Before: Single instance
mongodb: standalone

// After: Replica set (1 primary + 2 secondaries)
mongodb:
  primary: mongo-0
  secondaries: [mongo-1, mongo-2]
  
// Reads go to secondaries
await Restaurant.find().read('secondaryPreferred');

// Writes go to primary
await Restaurant.create(data);
```

**Redis:**
```javascript
// Before: Single instance
redis: standalone

// After: Redis Sentinel (high availability)
redis:
  master: redis-0
  replicas: [redis-1, redis-2]
  sentinel: [sentinel-0, sentinel-1, sentinel-2]
```

**3. Load Balancing**
```nginx
upstream api_gateway {
  least_conn;  # Route to least busy server
  server gateway-1:3000 max_fails=3 fail_timeout=30s;
  server gateway-2:3000 max_fails=3 fail_timeout=30s;
  server gateway-3:3000 max_fails=3 fail_timeout=30s;
}
```

**4. Caching Layer Enhancement**
- Increase Redis memory (1GB → 16GB)
- Longer TTL for static data (menus: 5min → 30min)
- CDN for images (Cloudflare, CloudFront)
- Browser caching headers

**Cost:** ~$500/month (3 app servers, 3 DB replicas, load balancer)

---

### Phase 2: Geographic Distribution (100x → 1,000x)

**Target:** 100,000 orders/day → 1,000,000 orders/day across multiple regions

**Problem:** Single datacenter = high latency for global users

**Solution:** Multi-region deployment

**Architecture:**
```
USA West (Primary)          USA East (Replica)         Europe (Replica)
├─ API Gateway             ├─ API Gateway            ├─ API Gateway
├─ All Services            ├─ Read Services          ├─ Read Services  
└─ MongoDB Primary         └─ MongoDB Secondary      └─ MongoDB Secondary
```

**DNS-Based Routing:**
```
User in California → usa-west.quickbite.com
User in New York   → usa-east.quickbite.com
User in London     → europe.quickbite.com
```

**Database Strategy:**

**Option 1: Active-Active (Complex)**
- Multiple primary databases
- Conflict resolution needed
- Uber Eats uses this

**Option 2: Active-Passive (Simpler)**
- One primary (writes), multiple secondaries (reads)
- QuickBite would use this

**Option 3: Sharded by Region**
- US orders → US database
- EU orders → EU database
- No cross-region queries

**Implementation:**
```javascript
// Route based on user location
const region = getUserRegion(userId);
const dbConnection = getDBConnection(region);
await dbConnection.Order.create(orderData);
```

**Cost:** ~$5,000/month (3 regions × infrastructure)

---

### Phase 3: Database Sharding (1,000x → 10,000x)

**Target:** 1M orders/day → 10M orders/day

**Problem:** Single MongoDB instance maxes out at ~10k writes/sec

**Solution:** Shard database across multiple servers

**Sharding Strategy:**

**Option 1: Shard by User ID**
```javascript
// Hash userId to determine shard
shard_0: userIds 0-333,333
shard_1: userIds 333,334-666,666
shard_2: userIds 666,667-999,999
```

**Pros:** Even distribution
**Cons:** Can't query "all orders for restaurant" efficiently

**Option 2: Shard by Restaurant ID**
```javascript
shard_0: restaurantIds 0-9,999
shard_1: restaurantIds 10,000-19,999
...
```

**Pros:** Restaurant queries efficient
**Cons:** Popular restaurants create hot spots

**Option 3: Shard by Geographic Region**
```javascript
shard_west: California, Nevada, Arizona
shard_east: New York, Massachusetts, Florida
shard_central: Texas, Illinois, Ohio
```

**Pros:** Locality (fast queries)
**Cons:** Uneven distribution (NYC >> Wyoming)

**Uber Eats Approach:** Combination
- Primary: Shard by user ID
- Secondary indexes for restaurant queries
- Accepts some cross-shard queries

**MongoDB Sharding Config:**
```javascript
sh.enableSharding("order_service");
sh.shardCollection("order_service.orders", { userId: "hashed" });

// Queries
db.orders.find({ userId: "123" });  // ✅ Single shard (fast)
db.orders.find({ restaurantId: "456" });  // ❌ All shards (slow)
```

**Cost:** ~$20,000/month (10 shards × replicas)

---

### Phase 4: Event Streaming (10,000x → 100,000x)

**Target:** 10M orders/day → 100M orders/day

**Problem:** RabbitMQ maxes out at ~50k messages/sec

**Solution:** Replace RabbitMQ with Apache Kafka

**Why Kafka at Scale:**

| Feature | RabbitMQ | Kafka |
|---------|----------|-------|
| **Throughput** | 50k msg/sec | 1M msg/sec |
| **Storage** | In-memory | Disk (persistent) |
| **Replay** | No | Yes (retain logs) |
| **Partitions** | No | Yes (parallel consumers) |
| **Use Case** | Task queue | Event streaming |

**Architecture Change:**
```javascript
// Before: RabbitMQ
await channel.publish('order.created', event);

// After: Kafka
await producer.send({
  topic: 'orders',
  messages: [{ key: orderId, value: event }]
});
```

**Kafka Partitioning:**
```
orders topic:
  partition-0: userIds 0-24,999
  partition-1: userIds 25,000-49,999
  partition-2: userIds 50,000-74,999
  partition-3: userIds 75,000-99,999

Each partition: 250k orders/day
4 consumers (1 per partition) = 1M orders/day
```

**Benefits:**
- Replay events (reprocess if consumer had bug)
- Multiple consumers per topic (analytics, ML, notifications)
- Guaranteed ordering within partition
- Massive throughput

**Cost:** ~$5,000/month (managed Kafka cluster)

---

### Phase 5: Microservices Splitting (100,000x)

**Target:** 100M orders/day (Uber Eats scale)

**Problem:** Order Service doing too much (creating orders, assigning drivers, calculating pricing, etc.)

**Solution:** Split into smaller services

**Current:**
```
Order Service:
  - Create order
  - Calculate pricing
  - Assign driver
  - Track delivery
  - Handle payments
```

**After Splitting:**
```
Order Service:         Create and manage orders
Pricing Service:       Calculate prices, apply promos
Driver Service:        Already separate (geospatial)
Tracking Service:      Real-time location tracking
Payment Service:       Process payments, refunds
Notification Service:  Already separate (events)
```

**Benefits:**
- Each service scales independently
- Smaller codebases (easier to understand)
- Team ownership (pricing team, payment team)
- Technology choice (Rust for high-perf tracking)

**Drawbacks:**
- More services (12 instead of 6)
- More complexity (coordination needed)
- More operational overhead

**Inter-Service Communication:**
```javascript
// Order Service calls Pricing Service
const price = await pricingService.calculatePrice({
  restaurantId,
  items,
  userId,
  deliveryAddress
});

// Order Service calls Payment Service
const payment = await paymentService.charge({
  userId,
  amount: price,
  orderId
});
```

---

### Phase 6: Caching Everything

**Multi-Layer Caching:**

**Level 1: Browser Cache**
```javascript
// Static assets: 1 year
Cache-Control: public, max-age=31536000, immutable

// API responses: 5 minutes
Cache-Control: public, max-age=300
```

**Level 2: CDN (Cloudflare/CloudFront)**
- Images, CSS, JS
- Popular API responses (restaurant listings)
- 200+ edge locations worldwide

**Level 3: API Gateway Cache**
```javascript
// Cache at gateway level
if (req.method === 'GET' && !req.headers.authorization) {
  const cached = await gatewayCache.get(req.url);
  if (cached) return cached;
}
```

**Level 4: Application Cache (Redis)**
- Restaurant data
- Menu items
- User profiles
- Pricing rules

**Level 5: Database Cache**
- MongoDB query cache
- Index in memory
- WiredTiger cache

**Hit Rate Goals:**
- Browser: 70% (repeat visitors)
- CDN: 90% (static assets)
- Redis: 85% (popular restaurants)
- DB: 95% (indexes loaded)

---

### Phase 7: Observability & Monitoring

**Logging:**
```javascript
// Structured logging with Winston
logger.info('Order created', {
  orderId,
  userId,
  restaurantId,
  amount,
  timestamp: Date.now(),
  region: 'us-west',
  service: 'order-service'
});
```

**Centralized with ELK Stack:**
- Elasticsearch: Store logs
- Logstash: Process logs
- Kibana: Visualize logs

**Metrics:**
```javascript
// Prometheus metrics
ordersCreated.inc();
orderValue.observe(amount);
orderLatency.observe(processingTime);
```

**Dashboards:**
- Grafana for visualization
- Alerts on anomalies (latency spike, error rate)

**Distributed Tracing:**
```javascript
// Jaeger/Zipkin
const span = tracer.startSpan('create-order');
span.setTag('userId', userId);

// Trace across services
gateway → user-service → order-service → restaurant-service
  10ms        5ms            20ms             15ms
Total: 50ms
```

**Alerts:**
- Error rate > 1% → Page on-call engineer
- Latency p95 > 500ms → Slack alert
- Queue depth > 10,000 → Auto-scale consumers
- Disk > 80% → Provision more storage

---

### Phase 8: Disaster Recovery

**Backup Strategy:**
```bash
# MongoDB automated backups
- Hourly snapshots (kept 24h)
- Daily backups (kept 7 days)
- Weekly backups (kept 4 weeks)
- Monthly backups (kept 1 year)
```

**Recovery Scenarios:**

**Scenario 1: Database Corruption**
- Restore from last hourly snapshot
- Replay Kafka events to catch up
- Downtime: 15 minutes

**Scenario 2: Region Failure**
- Failover to secondary region
- DNS update to redirect traffic
- Downtime: 5 minutes (automated)

**Scenario 3: Complete Data Loss**
- Restore from off-site backups (S3 Glacier)
- Rebuild from events (event sourcing)
- Downtime: 2-4 hours

**Disaster Recovery Plan:**
1. Detect failure (automated monitoring)
2. Alert team (PagerDuty)
3. Activate DR site
4. Update DNS
5. Verify functionality
6. Investigate root cause
7. Post-mortem

---

### Final Architecture (Uber Eats Scale)

```
Global Traffic (100M orders/day)
         ↓
    CloudFlare CDN
         ↓
    Route53 (DNS)
    ├─ us-west.quickbite.com
    ├─ us-east.quickbite.com
    └─ europe.quickbite.com
         ↓
    Load Balancers (ALB/NLB)
         ↓
    API Gateway (10 instances per region)
         ↓
    Microservices (50+ instances each)
    ├─ User Service
    ├─ Restaurant Service
    ├─ Order Service
    ├─ Driver Service
    ├─ Notification Service
    ├─ Pricing Service
    ├─ Payment Service
    ├─ Tracking Service
    └─ Analytics Service
         ↓
    Data Layer
    ├─ MongoDB Sharded Cluster (30+ shards)
    ├─ Redis Cluster (20+ nodes)
    ├─ Kafka Cluster (15+ brokers)
    └─ PostgreSQL (analytics)
         ↓
    Observability
    ├─ Prometheus (metrics)
    ├─ Grafana (dashboards)
    ├─ ELK Stack (logs)
    └─ Jaeger (tracing)
```

**Infrastructure Cost:** ~$500,000/month
**Team Size:** 200+ engineers
**Availability:** 99.99% (52 minutes downtime/year)

---

## Common Pitfalls & Debugging

### 1. The N+1 Query Problem

**Symptom:** API endpoint slow, getting worse as data grows

**Code:**
```javascript
// ❌ BAD: N+1 queries
const orders = await Order.find({ userId }); // 1 query

for (const order of orders) {
  order.restaurant = await Restaurant.findById(order.restaurantId); // N queries!
}
// Total: 1 + N queries (N = 100 orders = 101 DB calls)
```

**Why It's Bad:**
- 100 orders = 101 database round trips
- Each query: ~10ms latency
- Total: 1,010ms just for queries
- Doesn't scale (1000 orders = 10 seconds!)

**Solution 1: Batch Query**
```javascript
// ✅ GOOD: 2 queries total
const orders = await Order.find({ userId });
const restaurantIds = orders.map(o => o.restaurantId);
const restaurants = await Restaurant.find({ _id: { $in: restaurantIds } });

// Create lookup map
const restaurantMap = restaurants.reduce((map, r) => {
  map[r._id.toString()] = r;
  return map;
}, {});

// Attach to orders
orders.forEach(order => {
  order.restaurant = restaurantMap[order.restaurantId.toString()];
});
```

**Solution 2: Mongoose Populate**
```javascript
// ✅ GOOD: Mongoose handles batching
const orders = await Order.find({ userId }).populate('restaurantId');
// Under the hood: Same as Solution 1
```

**Solution 3: Denormalize**
```javascript
// ✅ GOOD: Store restaurant name in order
const order = {
  userId,
  restaurantId,
  restaurantName: restaurant.name, // Denormalized
  restaurantAddress: restaurant.address,
  items: [...]
};
```

**When to Use Each:**
- **Populate:** Most cases (simple, works well)
- **Manual Batch:** Need control, complex queries
- **Denormalize:** Read-heavy, OK with stale data

---

### 2. Memory Leaks in Node.js

**Symptom:** Service crashes after running for hours/days

**Common Causes:**

**Cause 1: Global Variables**
```javascript
// ❌ BAD: Grows unbounded
let requests = [];
app.get('/api/orders', (req, res) => {
  requests.push(req); // Memory leak!
  res.json(orders);
});
```

**Fix:**
```javascript
// ✅ GOOD: No global state
app.get('/api/orders', (req, res) => {
  // Request handled and garbage collected
  res.json(orders);
});
```

**Cause 2: Event Listeners**
```javascript
// ❌ BAD: Listener never removed
function processOrder(orderId) {
  const emitter = new EventEmitter();
  emitter.on('complete', () => { /* handler */ }); // Leak!
  return emitter;
}
```

**Fix:**
```javascript
// ✅ GOOD: Remove listener
function processOrder(orderId) {
  const emitter = new EventEmitter();
  const handler = () => { /* ... */ };
  emitter.once('complete', handler); // Auto-removes
  return emitter;
}
```

**Cause 3: Closures**
```javascript
// ❌ BAD: Closure holds reference
function createHandler() {
  const largeData = Buffer.alloc(10 * 1024 * 1024); // 10MB
  return function(req, res) {
    // Handler keeps largeData in memory!
    res.json({ ok: true });
  };
}
```

**Fix:**
```javascript
// ✅ GOOD: No closure over large data
function createHandler() {
  return function(req, res) {
    const data = getDataOnDemand(); // Fetch when needed
    res.json({ ok: true });
  };
}
```

**Debugging:**
```bash
# Take heap snapshot
node --inspect server.js
# Chrome DevTools → Memory → Take snapshot
# Compare snapshots over time
```

---

### 3. Race Conditions

**Symptom:** Intermittent bugs, works 99% of the time

**Scenario: Double Order**
```javascript
// ❌ BAD: Race condition
async function createOrder(userId, items) {
  const existingOrder = await Order.findOne({
    userId,
    status: 'PENDING'
  });
  
  if (existingOrder) {
    throw new Error('Already have pending order');
  }
  
  // Race: Two requests reach here simultaneously
  return Order.create({ userId, items, status: 'PENDING' });
}
```

**What Happens:**
```
Request A: Check DB → No pending order ✓
Request B: Check DB → No pending order ✓ (race!)
Request A: Create order → Success
Request B: Create order → Success (duplicate!)
```

**Solution 1: Unique Index**
```javascript
// ✅ GOOD: Database enforces uniqueness
orderSchema.index(
  { userId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } }
);

// Second create will fail with duplicate key error
try {
  await Order.create({ userId, items, status: 'PENDING' });
} catch (err) {
  if (err.code === 11000) { // Duplicate key
    throw new Error('Already have pending order');
  }
  throw err;
}
```

**Solution 2: Distributed Lock (Redis)**
```javascript
// ✅ GOOD: Lock prevents concurrent access
const lockKey = `order:lock:${userId}`;
const locked = await redis.set(lockKey, '1', 'EX', 10, 'NX');

if (!locked) {
  throw new Error('Order creation in progress');
}

try {
  await Order.create({ userId, items, status: 'PENDING' });
} finally {
  await redis.del(lockKey);
}
```

**Solution 3: Optimistic Locking**
```javascript
// ✅ GOOD: Version field detects conflicts
orderSchema.add({ version: { type: Number, default: 0 } });

async function updateOrder(orderId, updates, expectedVersion) {
  const result = await Order.updateOne(
    { _id: orderId, version: expectedVersion },
    { ...updates, $inc: { version: 1 } }
  );
  
  if (result.modifiedCount === 0) {
    throw new Error('Order was modified by another request');
  }
}
```

---

### 4. Blocking the Event Loop

**Symptom:** API becomes unresponsive under load

**Problem:**
```javascript
// ❌ BAD: Synchronous operation blocks event loop
app.get('/api/hash', (req, res) => {
  const hash = crypto.pbkdf2Sync( // SYNC = BLOCKING!
    req.body.password,
    'salt',
    100000,
    64,
    'sha512'
  );
  res.json({ hash });
});
```

**Why Bad:**
- `pbkdf2Sync` takes ~100ms
- Event loop blocked for 100ms
- No other requests processed during this time
- 10 concurrent requests = 1 second latency

**Solution:**
```javascript
// ✅ GOOD: Async version doesn't block
app.post('/api/hash', async (req, res) => {
  const hash = await new Promise((resolve, reject) => {
    crypto.pbkdf2(
      req.body.password,
      'salt',
      100000,
      64,
      'sha512',
      (err, key) => {
        if (err) reject(err);
        else resolve(key);
      }
    );
  });
  res.json({ hash });
});
```

**Other Blocking Operations:**
- `fs.readFileSync()` → Use `fs.promises.readFile()`
- `JSON.parse()` on large data → Use streaming parser
- Complex calculations → Move to worker threads
- Heavy regex → Limit input size

**Detecting:**
```javascript
// Monitor event loop lag
const { monitorEventLoopDelay } = require('perf_hooks');
const h = monitorEventLoopDelay({ resolution: 20 });
h.enable();

setInterval(() => {
  console.log('Event loop delay:', h.mean, 'ms');
  if (h.mean > 100) {
    logger.warn('Event loop blocked!');
  }
}, 10000);
```

---

### 5. Connection Pool Exhaustion

**Symptom:** Requests timeout after handling fine initially

**Problem:**
```javascript
// ❌ BAD: No connection limit
mongoose.connect(MONGO_URI); // Default: Unlimited connections

// Under load:
// Request 1: Opens connection
// Request 2: Opens connection
// ...
// Request 1000: Opens connection
// MongoDB maxConnections reached → New requests timeout
```

**Solution:**
```javascript
// ✅ GOOD: Configure pool size
mongoose.connect(MONGO_URI, {
  maxPoolSize: 10,          // Max 10 connections
  minPoolSize: 2,           // Keep 2 warm
  maxIdleTimeMS: 60000,     // Close idle after 60s
  serverSelectionTimeoutMS: 5000, // Fail fast
  socketTimeoutMS: 45000,   // Socket timeout
});
```

**Why It Works:**
- Reuse connections (faster than creating new)
- Limit concurrent DB operations
- Fail fast if pool exhausted (better than hanging)

**Monitoring:**
```javascript
mongoose.connection.on('open', () => {
  const { poolSize } = mongoose.connection.db.serverConfig;
  logger.info(`Pool size: ${poolSize}`);
});
```

**Redis Pool:**
```javascript
const redis = new Redis({
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});
```

---

### 6. Cascading Failures

**Symptom:** One service down brings down entire system

**Scenario:**
```
Restaurant Service crashes
         ↓
API Gateway keeps calling it (5s timeout each)
         ↓
Requests queue up
         ↓
API Gateway runs out of memory
         ↓
Entire API down
```

**Solution: Circuit Breaker**
```javascript
// ✅ GOOD: Circuit breaker prevents cascade
const breaker = new CircuitBreaker(callRestaurantService, {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

breaker.fallback(() => {
  // Return cached data instead of failing
  return getCachedRestaurants();
});

breaker.on('open', () => {
  logger.error('Circuit breaker opened for restaurant service');
  alertTeam('Restaurant service circuit open');
});
```

**Solution: Timeout**
```javascript
// ✅ GOOD: Timeout prevents hanging
const response = await axios.get(RESTAURANT_SERVICE_URL, {
  timeout: 3000 // Fail after 3s
});
```

**Solution: Bulkhead**
```javascript
// ✅ GOOD: Isolate resources per service
const restaurantPool = new ConnectionPool({ size: 5 });
const orderPool = new ConnectionPool({ size: 10 });

// Restaurant service slow? Only affects its pool
// Order service continues working
```

---

### 7. Debugging Distributed Systems

**Problem: Request fails, error spans multiple services**

**Strategy:**

**1. Correlation IDs**
```javascript
// Generate unique ID for each request
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || uuid();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
});

// Pass to backend services
const response = await axios.get(SERVICE_URL, {
  headers: { 'x-correlation-id': req.correlationId }
});

// Log with correlation ID
logger.info('Order created', { correlationId: req.correlationId, orderId });
```

**2. Distributed Tracing**
```javascript
// Jaeger/Zipkin
const tracer = initTracer('order-service');

app.get('/api/orders', async (req, res) => {
  const span = tracer.startSpan('create-order');
  span.setTag('userId', req.user.id);
  
  const childSpan = tracer.startSpan('fetch-restaurant', { childOf: span });
  const restaurant = await getRestaurant(restaurantId);
  childSpan.finish();
  
  span.finish();
});

// Visualize:
// Gateway (10ms) → User Service (5ms) → Order Service (20ms) → Restaurant Service (15ms)
// Total: 50ms
```

**3. Structured Logging**
```javascript
// ❌ BAD: Unstructured
logger.info(`User ${userId} created order ${orderId}`);

// ✅ GOOD: Structured (searchable)
logger.info('Order created', {
  userId,
  orderId,
  restaurantId,
  amount,
  service: 'order-service',
  correlationId: req.correlationId,
  timestamp: Date.now()
});
```

**4. Centralized Logging**
```bash
# Send all logs to Elasticsearch
services:
  order-service:
    logging:
      driver: "fluentd"
      options:
        fluentd-address: "localhost:24224"
        tag: "order-service"

# Query logs
GET /logs/_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "correlationId": "abc-123" } },
        { "range": { "timestamp": { "gte": "now-1h" } } }
      ]
    }
  }
}
```

---

## Interview Question Bank

### System Design Questions

**Q1: "Design a food delivery system like Uber Eats."**

**Approach:**

**1. Requirements Gathering (5 min)**
- **Functional:** Users browse restaurants, place orders, track delivery, pay
- **Non-Functional:** 100K orders/day, <500ms latency, 99.9% uptime
- **Scale:** 1M users, 10K restaurants, 5K drivers

**2. High-Level Design (10 min)**
```
Mobile/Web → API Gateway → Microservices → Databases
                 ↓
    [User, Restaurant, Order, Driver, Payment]
                 ↓
        [MongoDB, Redis, RabbitMQ]
```

**3. Deep Dive (20 min)**

**Database Design:**
- User Service: MongoDB (user profiles, auth)
- Restaurant Service: MongoDB (menus, hours) + Redis (caching)
- Order Service: MongoDB (orders) + RabbitMQ (events)
- Driver Service: MongoDB with geospatial indexes

**API Design:**
- `POST /api/orders` - Create order
- `GET /api/restaurants/nearby?lat=...&lng=...` - Find restaurants
- `PUT /api/drivers/:id/location` - Update driver location
- `GET /api/orders/:id/track` - Track delivery (WebSocket)

**Scaling:**
- Horizontal scaling for services
- Database sharding by user ID
- CDN for restaurant images
- Redis cluster for caching

**4. Bottlenecks & Trade-offs (10 min)**
- **Bottleneck:** Driver location updates (1000s/sec)
  - *Solution:* Kafka for event streaming, geospatial indexes
- **Trade-off:** Eventual consistency (driver location slightly delayed)
  - *Acceptable:* 30-second delay OK for tracking
- **Trade-off:** Microservices complexity vs scalability
  - *Decision:* Start monolith, split at scale

---

**Q2: "How do you handle payment failures?"**

**Answer:**

**Scenario:** User places order, payment fails

**Approach:**

**1. Immediate Handling:**
```javascript
try {
  const payment = await paymentService.charge({
    userId,
    amount,
    orderId
  });
  
  // Update order
  await Order.updateOne(
    { _id: orderId },
    { status: 'CONFIRMED', paymentId: payment.id }
  );
  
} catch (paymentError) {
  // Payment failed
  await Order.updateOne(
    { _id: orderId },
    { status: 'PAYMENT_FAILED', error: paymentError.message }
  );
  
  // Notify user
  await sendNotification(userId, 'Payment failed. Please try again.');
  
  throw paymentError; // Propagate to client
}
```

**2. Retry Logic:**
```javascript
const retry = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
};

const payment = await retry(() => paymentService.charge(...));
```

**3. Idempotency:**
```javascript
// Prevent double-charging
const idempotencyKey = `order:${orderId}:payment`;
const existing = await Payment.findOne({ idempotencyKey });
if (existing) {
  return existing; // Already processed
}

const payment = await paymentProvider.charge({
  amount,
  idempotencyKey // Payment provider handles duplicates
});

await Payment.create({ orderId, ...payment, idempotencyKey });
```

**4. Saga Pattern (Rollback):**
```javascript
// If payment succeeds but order creation fails
try {
  const payment = await paymentService.charge(...);
  const order = await orderService.create(...);
} catch (err) {
  // Rollback: Refund payment
  await paymentService.refund(payment.id);
  throw err;
}
```

**5. Dead Letter Queue:**
```javascript
// Failed payments go to DLQ for manual review
if (payment.status === 'failed') {
  await dlq.send({
    orderId,
    userId,
    amount,
    error: payment.error,
    timestamp: Date.now()
  });
  
  // Alert finance team
  await alertTeam('Payment DLQ has new items');
}
```

---

**Q3: "How do you ensure real-time order tracking?"**

**Answer:**

**Technology:** WebSockets for real-time updates

**Architecture:**
```
Driver App → Driver Service → Redis Pub/Sub → WebSocket Server → Customer App
    (location)      (save)        (publish)        (push)         (display)
```

**Implementation:**

**1. Driver Updates Location:**
```javascript
// Driver app sends location every 10 seconds
PUT /api/drivers/:id/location
{
  "latitude": 37.7749,
  "longitude": -122.4194
}

// Driver Service
await Driver.findByIdAndUpdate(driverId, {
  currentLocation: {
    type: 'Point',
    coordinates: [longitude, latitude]
  },
  lastUpdated: Date.now()
});

// Publish to Redis
await redis.publish('driver-location', JSON.stringify({
  driverId,
  orderId,
  latitude,
  longitude,
  timestamp: Date.now()
}));
```

**2. WebSocket Server Subscribes:**
```javascript
// WebSocket server listens to Redis
redis.subscribe('driver-location');

redis.on('message', (channel, message) => {
  const { driverId, orderId, latitude, longitude } = JSON.parse(message);
  
  // Find connected customers for this order
  const sockets = getSocketsForOrder(orderId);
  
  // Push to customers
  sockets.forEach(socket => {
    socket.emit('driver-location', { latitude, longitude });
  });
});
```

**3. Customer Connects:**
```javascript
// Customer app connects via WebSocket
const socket = io('wss://quickbite.com', {
  auth: { token: jwtToken }
});

socket.emit('track-order', { orderId });

socket.on('driver-location', (location) => {
  updateMapMarker(location.latitude, location.longitude);
});
```

**Scaling:**
- **Problem:** 10K concurrent WebSocket connections
- **Solution:** Multiple WebSocket servers + sticky sessions
```nginx
upstream websocket_servers {
  ip_hash; # Sticky sessions
  server ws-1:3000;
  server ws-2:3000;
  server ws-3:3000;
}
```

**Alternative: Server-Sent Events (SSE)**
```javascript
// Simpler, one-way (server → client)
app.get('/api/orders/:id/track', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  
  const interval = setInterval(async () => {
    const location = await getDriverLocation(orderId);
    res.write(`data: ${JSON.stringify(location)}\n\n`);
  }, 10000);
  
  req.on('close', () => clearInterval(interval));
});
```

---

**Q4: "How do you assign the optimal driver to an order?"**

**Answer:**

**Simple Approach: Nearest Available Driver**
```javascript
async function assignDriver(order) {
  const drivers = await Driver.find({
    status: 'available',
    isActive: true,
    currentLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [order.restaurant.longitude, order.restaurant.latitude]
        },
        $maxDistance: 5000 // 5km radius
      }
    }
  }).limit(10);
  
  if (drivers.length === 0) {
    throw new Error('No drivers available');
  }
  
  const driver = drivers[0]; // Nearest
  await driver.assignOrder(order._id);
  return driver;
}
```

**Advanced Approach: Weighted Scoring**
```javascript
async function assignOptimalDriver(order) {
  const candidates = await Driver.findNearby(...);
  
  const scored = await Promise.all(candidates.map(async (driver) => {
    // Calculate score based on multiple factors
    const distanceScore = 1 - (driver.distance / 5000); // 0-1
    const ratingScore = driver.rating / 5; // 0-1
    const loadScore = 1 - (driver.todayDeliveries / 20); // Prefer less busy
    
    // Get ETA from routing API (traffic-aware)
    const eta = await routingService.getETA(
      driver.currentLocation,
      order.restaurant.location
    );
    const etaScore = 1 - (eta / 1800); // 30 min max
    
    const totalScore = (
      distanceScore * 0.4 +
      ratingScore * 0.2 +
      loadScore * 0.2 +
      etaScore * 0.2
    );
    
    return { driver, score: totalScore };
  }));
  
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].driver;
  
  await best.assignOrder(order._id);
  return best;
}
```

**Uber's Approach: Machine Learning**
- Train model on historical data
- Features: distance, traffic, driver rating, acceptance rate, time of day
- Predict: Delivery time, acceptance probability
- Optimize: Overall system efficiency (not just individual order)

**Trade-offs:**
- **Simple (distance only):** Fast, predictable, easy to debug
- **Weighted scoring:** Better assignments, more complex, slower
- **ML-based:** Optimal, requires data/infrastructure, black box

---

**Q5: "How would you implement surge pricing?"**

**Answer:**

**Goal:** Increase prices when demand > supply, incentivize drivers

**Implementation:**

**1. Calculate Demand/Supply Ratio:**
```javascript
async function getSurgeMultiplier(location, timestamp) {
  const { latitude, longitude } = location;
  
  // Count orders in area (last 15 min)
  const demand = await Order.countDocuments({
    'restaurant.location': {
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: 2000 // 2km
      }
    },
    createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
  });
  
  // Count available drivers
  const supply = await Driver.countDocuments({
    status: 'available',
    currentLocation: {
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: 2000
      }
    }
  });
  
  // Calculate ratio
  const ratio = demand / Math.max(supply, 1);
  
  // Map to multiplier (1.0x - 3.0x)
  let multiplier = 1.0;
  if (ratio > 3) multiplier = 3.0;
  else if (ratio > 2) multiplier = 2.0;
  else if (ratio > 1.5) multiplier = 1.5;
  
  // Store in cache (update every 5 min)
  const cacheKey = `surge:${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
  await redis.setex(cacheKey, 300, multiplier);
  
  return multiplier;
}
```

**2. Apply to Price:**
```javascript
async function calculatePrice(order) {
  const basePrice = calculateBasePrice(order.items);
  const deliveryFee = calculateDeliveryFee(order.distance);
  
  const surgeMultiplier = await getSurgeMultiplier(
    order.restaurant.location,
    order.createdAt
  );
  
  const surgeFee = deliveryFee * (surgeMultiplier - 1);
  
  return {
    basePrice,
    deliveryFee,
    surgeMultiplier,
    surgeFee,
    total: basePrice + deliveryFee + surgeFee
  };
}
```

**3. Notify Customer:**
```javascript
// Show surge pricing prominently
{
  "pricing": {
    "subtotal": 25.00,
    "deliveryFee": 5.00,
    "surgePricing": {
      "multiplier": 2.0,
      "fee": 5.00,
      "message": "High demand in your area"
    },
    "total": 35.00
  }
}
```

**Advanced:**
- **Dynamic zones:** Split city into hex grids, surge per grid
- **Predictive:** ML to predict surge before it happens
- **Driver incentives:** Pay drivers more during surge
- **Transparency:** Show heat map of surge areas

---

### Technical Deep-Dive Questions

**Q6: "Explain how MongoDB geospatial queries work."**

**Answer:**

**1. GeoJSON Format:**
```javascript
{
  type: 'Point',
  coordinates: [-122.4194, 37.7749] // [longitude, latitude]
}
```
**Important:** Longitude first (not lat/lng like Google Maps shows)

**2. Create 2dsphere Index:**
```javascript
driverSchema.index({ currentLocation: '2dsphere' });

// MongoDB builds spatial index (similar to B-tree but for 2D space)
// Uses S2 geometry library (divides Earth into cells)
```

**3. Query Types:**

**$near (Find Nearest):**
```javascript
Driver.find({
  currentLocation: {
    $near: {
      $geometry: { type: 'Point', coordinates: [-122.4194, 37.7749] },
      $maxDistance: 5000 // meters
    }
  }
}).limit(10);

// Returns drivers sorted by distance (closest first)
// Uses index → O(log n) instead of O(n)
```

**$geoWithin (Within Polygon):**
```javascript
Restaurant.find({
  location: {
    $geoWithin: {
      $geometry: {
        type: 'Polygon',
        coordinates: [[
          [-122.5, 37.7],
          [-122.3, 37.7],
          [-122.3, 37.8],
          [-122.5, 37.8],
          [-122.5, 37.7] // Close the polygon
        ]]
      }
    }
  }
});
```

**4. How It Works Internally:**

**Without Index (Slow):**
```
For each driver:
  Calculate distance using Haversine formula
  Add to results if within maxDistance
Sort results by distance
Time: O(n log n)
```

**With 2dsphere Index (Fast):**
```
Use S2 cell hierarchy:
  Level 0: Entire Earth
  Level 1: 6 cells
  ...
  Level 30: ~1cm cells

Search:
  Find cells intersecting search radius
  Only check drivers in those cells
  Early termination when enough results
Time: O(log n + k) where k = results
```

**5. Distance Calculation:**

**Haversine Formula (spherical distance):**
```javascript
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}
```

**MongoDB uses spherical geometry automatically with 2dsphere**

---

**Q7: "How does JWT authentication work? What are the security concerns?"**

**Answer:**

**Structure:**
```
header.payload.signature
```

**Example:**
```
eyJhbGci0iJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20ifQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**1. Header (Base64):**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**2. Payload (Base64):**
```json
{
  "userId": "123",
  "email": "user@example.com",
  "role": "customer",
  "iat": 1621234567,
  "exp": 1621838367
}
```

**3. Signature:**
```javascript
HMACSHA256(
  base64(header) + "." + base64(payload),
  JWT_SECRET
)
```

**Flow:**

**Login:**
```javascript
// 1. User submits credentials
POST /api/auth/login
{ "email": "user@example.com", "password": "..." }

// 2. Server validates
const user = await User.findOne({ email });
const valid = await bcrypt.compare(password, user.password);

// 3. Generate JWT
const token = jwt.sign(
  { userId: user._id, email: user.email, role: user.role },
  JWT_SECRET,
  { expiresIn: '7d' }
);

// 4. Return to client
return { token, user };
```

**Authenticated Request:**
```javascript
// 1. Client sends token
GET /api/orders
Authorization: Bearer eyJhbGci0iJI...

// 2. Server verifies
const token = req.headers.authorization.split(' ')[1];
const decoded = jwt.verify(token, JWT_SECRET); // Throws if invalid/expired

// 3. Attach to request
req.user = decoded;

// 4. Proceed
const orders = await Order.find({ userId: req.user.userId });
```

**Security Concerns:**

**1. Secret Key Compromise:**
- **Risk:** Attacker can forge tokens
- **Mitigation:** 
  - Store secret in secure vault (AWS Secrets Manager)
  - Rotate secret periodically
  - Use RS256 (asymmetric) instead of HS256 for multi-service

**2. Token Theft (XSS):**
- **Risk:** Attacker steals token from localStorage
- **Mitigation:**
  - Store in httpOnly cookie (JavaScript can't access)
  - Use Content Security Policy
  - Sanitize all inputs

**3. Token Interception (MITM):**
- **Risk:** Attacker intercepts token in transit
- **Mitigation:**
  - Always use HTTPS
  - HSTS headers

**4. Can't Revoke Before Expiry:**
- **Risk:** Compromised token valid until expiration
- **Mitigation:**
  - Short expiry (15 min) + refresh tokens
  - Blacklist (store revoked tokens in Redis)
  - Session versioning

**5. Payload Not Encrypted:**
- **Risk:** Anyone can decode payload (base64 not encryption)
- **Mitigation:**
  - Don't put sensitive data in JWT
  - Use JWE (JSON Web Encryption) if needed

**Implementation:**
```javascript
// Blacklist example
async function isTokenRevoked(token) {
  const revoked = await redis.get(`revoked:${token}`);
  return !!revoked;
}

async function revokeToken(token) {
  const decoded = jwt.decode(token);
  const ttl = decoded.exp - Math.floor(Date.now() / 1000);
  await redis.setex(`revoked:${token}`, ttl, '1');
}

// Verify middleware
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  if (await isTokenRevoked(token)) {
    return res.status(401).json({ error: 'Token revoked' });
  }
  
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

---

**Q8: "What happens when Redis goes down?"**

**Answer:**

**Scenario:** Redis used for caching restaurant data

**Immediate Impact:**
```javascript
// All cache reads fail
try {
  const cached = await redis.get('restaurants:all');
  return JSON.parse(cached);
} catch (err) {
  // Redis down → Exception
  logger.error('Redis unavailable', err);
  // Fall through to database
}

// Database suddenly handles 100% of load
const restaurants = await Restaurant.find();
```

**System Behavior:**
- Response time: 50ms → 500ms (10x slower)
- Database CPU: 20% → 80%
- Request rate limit reached faster
- But system stays functional ✓

**Mitigation Strategies:**

**1. Graceful Degradation:**
```javascript
async function getRestaurants() {
  try {
    const cached = await redis.get('restaurants:all');
    if (cached) return JSON.parse(cached);
  } catch (err) {
    logger.warn('Cache unavailable, querying DB');
    // Continue to DB (don't throw)
  }
  
  const data = await Restaurant.find();
  
  // Try to cache (fail silently)
  try {
    await redis.setex('restaurants:all', 300, JSON.stringify(data));
  } catch (err) {
    // Cache write failed, but we have data
    logger.warn('Cache write failed');
  }
  
  return data;
}
```

**2. Circuit Breaker for Cache:**
```javascript
const cacheBreaker = new CircuitBreaker(redis.get, {
  timeout: 100, // Cache should be fast
  errorThresholdPercentage: 50
});

cacheBreaker.fallback(() => null); // Return null if cache down

async function getWithCache(key) {
  const cached = await cacheBreaker.fire(key);
  if (cached) return JSON.parse(cached);
  return await getFromDB();
}
```

**3. Redis Sentinel (High Availability):**
```javascript
// Setup: 1 master + 2 replicas + 3 sentinels
const redis = new Redis({
  sentinels: [
    { host: 'sentinel-1', port: 26379 },
    { host: 'sentinel-2', port: 26379 },
    { host: 'sentinel-3', port: 26379 }
  ],
  name: 'mymaster'
});

// Automatic failover:
// Master crashes → Sentinels elect new master → Clients reconnect
// Downtime: ~30 seconds
```

**4. Redis Cluster (Sharding):**
```javascript
const cluster = new Redis.Cluster([
  { host: 'redis-1', port: 6379 },
  { host: 'redis-2', port: 6379 },
  { host: 'redis-3', port: 6379 }
]);

// Data sharded across nodes
// One node fails → Only 1/3 of cache lost
// Other 2/3 still works
```

**5. Monitoring & Alerting:**
```javascript
redis.on('error', (err) => {
  logger.error('Redis connection error', err);
  alertTeam('Redis down - system degraded');
});

redis.on('reconnecting', () => {
  logger.info('Redis reconnecting');
});

redis.on('ready', () => {
  logger.info('Redis connected');
  alertTeam('Redis recovered');
});
```

**Production Setup:**
```
Redis Sentinel (for QuickBite scale)
├─ Master (writes)
├─ Replica 1 (reads)
├─ Replica 2 (reads)
└─ 3 Sentinels (monitoring)

Cost: ~$100/month
Availability: 99.9%
```

**Uber Eats Scale:**
```
Redis Cluster (100+ nodes)
├─ Sharded by key
├─ Replicas per shard
└─ Automatic failover

Cost: ~$50,000/month
Availability: 99.99%
```

---

**Last Updated:** Complete Guide with Scaling, Patterns, Debugging & Interview Q&A
