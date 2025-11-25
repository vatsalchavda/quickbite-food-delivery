# Multi-stage build for production optimization

# Stage 1: Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app

# Copy shared utilities first
COPY shared/ ./shared/

# Copy service package files
COPY services/user-service/package*.json ./

# Install dependencies
RUN npm install --only=production && npm cache clean --force

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy shared utilities and dependencies
COPY --from=dependencies --chown=nodejs:nodejs /app/shared ./shared
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy service code
COPY --chown=nodejs:nodejs services/user-service/ ./

# Create logs directory
RUN mkdir -p logs && chown nodejs:nodejs logs

USER nodejs

WORKDIR /app

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "src/server.js"]
