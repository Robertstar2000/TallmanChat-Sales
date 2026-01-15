# Multi-stage build for Tallman Chat Application

# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Stage 2: Backend server
FROM node:18-alpine AS backend

WORKDIR /app

# Install Docker CLI
RUN apk add --no-cache docker-cli

# Copy backend package files
COPY server/package*.json ./server/

# Install backend dependencies
RUN cd server && npm ci --only=production

# Copy built frontend from previous stage
COPY --from=frontend-build /app/dist ./dist

# Copy server source
COPY server/ ./server/

# Copy environment files
COPY .env.docker ./.env.docker

# Mount host docker binary for model commands

# Expose ports
EXPOSE 3210 3220

# Start the UI server, backend server, and granite API bridge
CMD ["sh", "-c", "node server/main-server.js & node server/granite-api.js & node server/backend-server.js"]
