# MCxOSC - Ember+ to OSC Bridge

A web-based microservice that bridges **Ember+** protocol devices (LAWO, Riedel, etc.) with **OSC** (Open Sound Control) devices.

## Architecture

```
┌─────────────┐     ┌──────────────────────────────────┐     ┌─────────────┐
│  Ember+     │◄───►│         MCxOSC Bridge            │◄───►│   OSC       │
│  Device     │ TCP │  ┌────────┐      ┌───────────┐   │ UDP │  Device     │
│ (e.g. LAWO) │     │  │Backend │◄────►│ Frontend  │   │     │ (e.g. QLab) │
└─────────────┘     │  │:3000   │      │ :80       │   │     └─────────────┘
                    │  └────────┘      └───────────┘   │
                    └──────────────────────────────────┘
```

## Quick Start

### Option 1: Docker (Recommended for Production)

```bash
# Clone and configure
git clone https://github.com/your-repo/MCxOSCnext.git
cd MCxOSCnext
cp .env.example .env

# Edit configuration
nano .env

# Start services
docker-compose up -d

# Access the dashboard
open http://localhost
```

### Option 2: Development Mode

```bash
# Install dependencies
cd packages
npm install

# Terminal 1: Start backend
cd packages/backend
npm run dev

# Terminal 2: Start frontend
cd packages/frontend
npm run dev

# Access the dashboard
open http://localhost:5173
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Ember+ Device (the device you want to control/monitor)
EMBER_HOST=192.168.1.100    # IP of your Ember+ device
EMBER_PORT=9000             # Ember+ port (usually 9000)
AUTO_CONNECT=true           # Auto-connect on startup

# OSC Device (the device that sends/receives OSC)
OSC_RX_PORT=8000            # Port MCxOSC listens on
OSC_TX_HOST=192.168.1.200   # IP of OSC target device
OSC_TX_PORT=9000            # Port of OSC target device

# Server
PORT=3000                   # Backend API port
HOST=0.0.0.0                # Listen on all interfaces
```

### Runtime Configuration

You can also configure devices at runtime via the web UI:
1. Click the ⚙️ icon in the header
2. Enter Ember+ device IP and port
3. Enter OSC device IP and ports
4. Click "Connect" or "Apply"

## Docker Deployment

### Using Docker Compose

```yaml
# docker-compose.yml is included in the repo
docker-compose up -d
```

### Custom Docker Setup

```bash
# Build images
docker build -t mcxosc-backend ./packages/backend
docker build -t mcxosc-frontend ./packages/frontend

# Run backend
docker run -d \
  --name mcxosc-backend \
  -p 3000:3000 \
  -p 8000:8000/udp \
  -e EMBER_HOST=192.168.1.100 \
  -e EMBER_PORT=9000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/sessions:/app/sessions \
  mcxosc-backend

# Run frontend
docker run -d \
  --name mcxosc-frontend \
  -p 80:80 \
  mcxosc-frontend
```

### Network Considerations

For Docker to communicate with external devices:

```bash
# Option 1: Use host network mode
docker run --network host mcxosc-backend

# Option 2: Ensure proper routing
# The container needs to reach your Ember+ and OSC devices
```

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/status` | Get service status |
| GET | `/api/v1/connections` | List all connections |
| POST | `/api/v1/connections` | Create connection |
| PUT | `/api/v1/connections/:id` | Update connection |
| DELETE | `/api/v1/connections/:id` | Delete connection |
| POST | `/api/v1/connections/:id/activate` | Activate connection |
| POST | `/api/v1/connections/activate-all` | Activate all |
| GET | `/api/v1/sessions` | List sessions |
| GET | `/api/v1/sessions/:name` | Load session |
| PUT | `/api/v1/sessions/:name` | Save session |
| GET | `/api/v1/tree` | Get Ember+ tree root |
| POST | `/api/v1/tree/:path/expand` | Expand tree node |
| GET | `/api/v1/config` | Get configuration |
| PUT | `/api/v1/config` | Update configuration |

### WebSocket

Connect to `ws://localhost:3000/ws` for real-time updates.

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');
ws.send(JSON.stringify({ type: 'subscribe', topics: ['connections', 'status'] }));
```

## Development

### Project Structure

```
packages/
├── backend/                 # Node.js/TypeScript API
│   ├── src/
│   │   ├── api/            # REST routes, WebSocket
│   │   ├── core/           # ConnectionManager, RateLimiter
│   │   ├── services/       # EmberService, OscService, BridgeEngine
│   │   └── types/          # TypeScript types
│   └── tests/              # Unit tests
├── frontend/               # React/Vite SPA
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # React hooks
│   │   ├── stores/         # Zustand stores
│   │   └── services/       # API client
│   └── index.html
└── package.json            # Monorepo root
```

### Running Tests

```bash
cd packages/backend
npm test
```

### Building for Production

```bash
# Build backend
cd packages/backend
npm run build

# Build frontend
cd packages/frontend
npm run build
```

## Session Files

MCxOSC can save and load session files containing your connection mappings.

- **New format**: `.mcxosc` (JSON)
- **Legacy format**: `.session` (compatible with old Electron app)

Sessions are stored in `./sessions/` directory.

## Troubleshooting

### Ember+ Connection Failed

1. Verify the Ember+ device IP is reachable: `ping 192.168.1.100`
2. Check the port is correct (usually 9000)
3. Ensure no firewall is blocking TCP connections

### OSC Not Receiving

1. Verify UDP port is not in use: `lsof -i :8000`
2. Check firewall allows UDP on the configured port
3. Verify the target device IP/port are correct

### Docker Networking Issues

```bash
# Check container can reach external network
docker exec mcxosc-backend ping 192.168.1.100

# Use host network if needed
docker run --network host mcxosc-backend
```

## License

MIT

## Credits

Based on [emberplus-connection](https://github.com/nrkno/tv-automation-emberplus-connection) library.
