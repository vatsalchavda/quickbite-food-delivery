# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY services/driver-service/package*.json ./

# Install ALL dependencies (including dev)
RUN npm install

# ============================================
# Stage 2: Production Dependencies
# ============================================
FROM node:20-alpine AS production-dependencies

WORKDIR /app

# Copy package files
COPY services/driver-service/package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# ============================================
# Stage 3: Production
# ============================================
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy production dependencies
COPY --from=production-dependencies /app/node_modules ./node_modules

# Copy application code
COPY services/driver-service/src ./src

# Copy shared utilities (logger, error handlers)
COPY shared ./src/shared

# Copy package.json for metadata
COPY services/driver-service/package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "src/server.js"]
