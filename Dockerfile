# Multi-stage build for Tallman Chat Application
# Optimized for both Docker Desktop and Docker Swarm deployment
# Per enterprise-app-foundation skill: Uses bullseye-slim and bcryptjs

# ===========================================
# Stage 1: Build the frontend
# ===========================================
FROM node:18-bullseye-slim AS frontend-build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# ===========================================
# Stage 2: Production runtime
# ===========================================
FROM node:18-bullseye-slim AS production

WORKDIR /app

# Install runtime dependencies
# Note: netcat-openbsd for health checks and service waiting
RUN apt-get update && apt-get install -y --no-install-recommends \
    netcat-openbsd \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Use the existing node user (UID/GID 1000 already exists in node images)
# This avoids conflicts with the base image's node user


# Copy backend package files
COPY server/package*.json ./server/

# Install backend dependencies (production only)
# Note: bcryptjs is used instead of native bcrypt per skill guidelines
RUN cd server && npm ci --only=production

# Copy built frontend from previous stage
COPY --from=frontend-build /app/dist ./dist

# Copy server source
COPY server/ ./server/

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create directories for logs and data
RUN mkdir -p /app/logs /app/data \
    && chown -R node:node /app

# Switch to non-root user (node user exists in base image)
USER node

# Expose ports
# 3230 - UI Server
# 3231 - Backend API Server  
# 12435 - Granite API Bridge
EXPOSE 3230 3231 12435

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3231/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Set entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]

# Default command - starts all services
# Default command - starts all services
CMD ["sh", "-c", "node server/main-server.js & node server/granite-api.js & node server/backend-server.js"]

# ===========================================
# Stage 3: Development env
# ===========================================
FROM frontend-build AS development

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    netcat-openbsd \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install server dependencies (including dev)
COPY server/package*.json ./server/
RUN cd server && npm install

# Expose ports
EXPOSE 3230 3231 12435

# Default command
CMD ["sh", "-c", "npm run dev & node server/backend-server.js"]
