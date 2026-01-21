---
trigger: model_decision
---
# Docker Deployment Rules

## Container Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Docker Compose                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────┐    ┌─────────────────┐        │
│  │    Frontend     │    │     Backend     │        │
│  │  (nginx/static) │    │  (Node.js)      │        │
│  │    Port 80      │───►│    Port 3000    │        │
│  └─────────────────┘    └────────┬────────┘        │
│                                  │                  │
│                         ┌────────┴────────┐        │
│                         │   Ember+ TCP    │        │
│                         │   Port 9000     │        │
│                         │                 │        │
│                         │   OSC UDP       │        │
│                         │   Port 8000 RX  │        │
│                         └─────────────────┘        │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │              Volumes                         │   │
│  │  ./config:/app/config                        │   │
│  │  ./sessions:/app/sessions                    │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build:
      context: ./packages/backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"      # REST API + WebSocket
      - "8000:8000/udp"  # OSC RX
    volumes:
      - ./config:/app/config
      - ./sessions:/app/sessions
    environment:
      - NODE_ENV=production
      - EMBER_HOST=${EMBER_HOST:-192.168.1.100}
      - EMBER_PORT=${EMBER_PORT:-9000}
      - OSC_RX_PORT=${OSC_RX_PORT:-8000}
      - OSC_TX_HOST=${OSC_TX_HOST:-192.168.1.200}
      - OSC_TX_PORT=${OSC_TX_PORT:-9000}
    restart: unless-stopped
    networks:
      - mcxosc-net
    # For Ember+ TCP, we need host network or proper port mapping
    # network_mode: host  # Alternative for direct network access

  frontend:
    build:
      context: ./packages/frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - mcxosc-net

networks:
  mcxosc-net:
    driver: bridge
```

## Backend Dockerfile

```dockerfile
# packages/backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY dist/ ./dist/
COPY config/ ./config/

# Create volume directories
RUN mkdir -p /app/sessions

# Expose ports
EXPOSE 3000
EXPOSE 8000/udp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/status || exit 1

# Start
CMD ["node", "dist/index.js"]
```

## Frontend Dockerfile

```dockerfile
# packages/frontend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Nginx Configuration

```nginx
# packages/frontend/nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy WebSocket
    location /ws {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

## Network Considerations

### Ember+ (TCP)
- Requires outbound TCP connection to Ember+ device
- Container needs network access to device subnet
- Consider `network_mode: host` if bridged networking fails

### OSC (UDP)
- **RX**: Expose UDP port for incoming messages
- **TX**: Outbound UDP to target device
- UDP doesn't require bidirectional port mapping

### Production Recommendations
```yaml
# For production with external network access
services:
  backend:
    network_mode: host  # Direct network access
    # OR use macvlan for dedicated IP
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | production | Environment mode |
| `EMBER_HOST` | - | Ember+ device IP |
| `EMBER_PORT` | 9000 | Ember+ port |
| `OSC_RX_PORT` | 8000 | OSC receive port |
| `OSC_TX_HOST` | - | OSC target IP |
| `OSC_TX_PORT` | 9000 | OSC target port |
| `AUTO_CONNECT` | true | Auto-connect on start |
| `AUTO_LOAD_SESSION` | - | Session file to load |

## Volume Mounts

| Path | Purpose |
|------|---------|
| `/app/config` | Configuration files |
| `/app/sessions` | Session storage |
| `/app/logs` | Log files (optional) |

## Health Checks

```bash
# Check backend health
curl http://localhost:3000/api/v1/status

# Check Ember+ connection
curl http://localhost:3000/api/v1/status/ember

# Check OSC status
curl http://localhost:3000/api/v1/status/osc
```
