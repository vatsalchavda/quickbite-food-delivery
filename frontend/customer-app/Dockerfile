# Frontend Dockerfile (Multi-stage build)
FROM node:20-alpine AS base

# Dependencies stage
FROM base AS dependencies
WORKDIR /app
COPY frontend/customer-app/package*.json ./
RUN npm install

# Build stage
FROM base AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY frontend/customer-app/ ./
RUN npm run build

# Production stage (nginx to serve static files)
FROM nginx:alpine AS production
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy built assets from build stage
COPY --from=build /app/dist .

# Copy custom nginx configuration
COPY frontend/customer-app/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
