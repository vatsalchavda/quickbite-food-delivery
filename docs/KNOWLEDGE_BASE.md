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

4. **Resilience Patterns**
   - Graceful degradation
   - Fail-safe error handling

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

---

## TODO: Topics to Add

- [ ] DAY 3: Event-driven architecture concepts
- [ ] DAY 4: Circuit breaker pattern
- [ ] DAY 5: Saga pattern for distributed transactions
- [ ] DAY 6-9: Kubernetes concepts
- [ ] Final: Complete interview guide

---

**Last Updated:** Day 2 - Restaurant Service & Caching
