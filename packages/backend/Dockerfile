# MCxOSC Backend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install build tools for native modules (emberplus-connection)
RUN apk add --no-cache python3 make g++

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Remove build tools to reduce image size
RUN apk del python3 make g++

# Copy built files
COPY --from=builder /app/dist ./dist

# Create directories for volumes
RUN mkdir -p /app/data /app/sessions

# Expose ports
EXPOSE 3000
EXPOSE 8000/udp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# Environment variables
ENV NODE_ENV=production
ENV PERSIST_PATH=/app/data/state.json
ENV SESSIONS_DIR=/app/sessions

# Start the application
CMD ["node", "dist/index.js"]
