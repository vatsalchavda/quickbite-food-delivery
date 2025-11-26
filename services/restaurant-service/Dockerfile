# Multi-stage build for smaller production image
FROM node:20-alpine AS base

# Install dependencies only
FROM base AS dependencies
WORKDIR /app

# Copy shared utilities first
COPY shared ./shared

# Copy package files
COPY services/restaurant-service/package*.json ./

# Install all dependencies
RUN npm install

# Production dependencies only
FROM base AS production-dependencies
WORKDIR /app

# Copy shared utilities
COPY shared ./shared

# Copy package file
COPY services/restaurant-service/package*.json ./
RUN npm install --omit=dev

# Build stage
FROM base AS build
WORKDIR /app

# Copy dependencies and source
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Production stage
FROM base AS production
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Copy production dependencies
COPY --from=production-dependencies /app/node_modules ./node_modules

# Copy shared utilities to src directory
COPY --chown=nodejs:nodejs shared ./src/shared

# Copy service source
COPY --chown=nodejs:nodejs services/restaurant-service/package*.json ./
COPY --chown=nodejs:nodejs services/restaurant-service/src ./src

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Use dumb-init for signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "src/server.js"]
