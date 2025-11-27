# QuickBite Food Delivery - Technical Knowledge Base

> **Purpose:** Centralized documentation for distributed systems concepts, design decisions, and interview preparation topics covered in this project.

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

1. [DAY 1: Infrastructure & User Service](#day-1-infrastructure--user-service)
2. [DAY 2: Restaurant Service & Caching](#day-2-restaurant-service--caching)
3. [DAY 3: Order Service & Events](#day-3-order-service--events)
4. [DAY 4: API Gateway & Resilience](#day-4-api-gateway--resilience)
5. [Design Patterns Reference](#design-patterns-reference)
6. [Interview Preparation Summary](#interview-preparation-summary)

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

## Interview Preparation Summary

### Key Topics Covered

1. **Microservices Architecture**
   - Database-per-service pattern
   - Service isolation
   - Stateless authentication

2. **Caching Strategies**
   - Cache-aside pattern
   - TTL strategies
   - Cache invalidation
   - Thundering herd problem

3. **Database Design**
   - Embedded vs referenced documents
   - Indexing strategies (text, geospatial, regular)
   - Read-heavy vs write-heavy optimization

4. **Event-Driven Architecture**
   - Event sourcing basics
   - RabbitMQ pub/sub
   - Topic exchanges and routing

5. **Resilience Patterns**
   - Circuit breaker (fail fast, auto-recovery)
   - Rate limiting (multi-tier strategy)
   - Graceful degradation
   - Request timeout and retry logic

6. **API Gateway Pattern**
   - Centralized routing and authentication
   - Cross-cutting concerns (logging, rate limiting)
   - Service abstraction
   - Backend service protection

### Common Interview Questions

**Q: "Design a caching layer for a restaurant listing service"**
**A:** Use cache-aside pattern with Redis. Key considerations:
- Identify read-heavy operations (browsing menus)
- Define TTL based on data volatility (5-10 min for restaurants)
- Implement pattern-based invalidation
- Handle cache failures gracefully
- Monitor cache hit rates

**Q: "How do you handle eventual consistency in microservices?"**
**A:** 
- Events for cross-service updates
- TTL ensures stale caches expire
- Accept eventual consistency for non-critical data
- Use distributed transactions (sagas) for critical flows

**Q: "What's your approach to database schema design?"**
**A:**
- Embed data accessed together (restaurant + menu)
- Index fields used in queries (cuisine, location)
- Consider access patterns over normalization
- Balance read vs write performance

**Q: "Explain the circuit breaker pattern and when to use it."**
**A:** Circuit breaker prevents cascading failures by failing fast when a service is unhealthy. Three states: CLOSED (normal), OPEN (failing fast), HALF_OPEN (testing recovery). Use when calling external services or microservices to prevent resource exhaustion and improve UX during failures. Configure error thresholds, timeouts, and reset periods.

**Q: "Why use an API Gateway instead of direct service calls?"**
**A:** API Gateway provides unified entry point for cross-cutting concerns (auth, rate limiting, logging). Decouples clients from backend topology, simplifies client code, enables centralized monitoring. Trade-offs include additional latency and potential bottleneck, mitigated through horizontal scaling.

**Q: "How do you implement rate limiting in a distributed system?"**
**A:** Use Redis as shared state for distributed counters. Implement sliding window algorithm for accuracy. Multiple tiers based on endpoint sensitivity (strict for auth, lenient for reads). Return 429 status with Retry-After header. Consider token bucket for burst traffic.

**Q: "What happens when your API Gateway fails?"**
**A:** Gateway is single point of failure. Mitigation: (1) Run multiple gateway instances behind load balancer, (2) Health checks and auto-restart, (3) Circuit breakers prevent gateway overload, (4) Monitoring and alerting for quick response. Gateway should be stateless for easy horizontal scaling.

---

## TODO: Topics to Add

- [ ] DAY 5: Driver Service & Real-time Tracking
- [ ] DAY 5: Notification Service & Event Consumers
- [ ] DAY 6-9: Kubernetes concepts (Deployments, Services, ConfigMaps, Secrets)
- [ ] DAY 6-9: Kustomize for environment-specific configs
- [ ] Final: Saga pattern for distributed transactions
- [ ] Final: Complete interview guide

---

**Last Updated:** Day 4 - API Gateway & Resilience
