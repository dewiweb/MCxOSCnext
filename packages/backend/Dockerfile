# MCxOSC Backend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools for native modules and git for nightly packages
RUN apk add --no-cache python3 make g++ git

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Prune dev dependencies
RUN npm prune --omit=dev

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built files and production node_modules from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

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
