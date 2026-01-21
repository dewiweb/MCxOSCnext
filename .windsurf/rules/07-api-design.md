---
trigger: always_on
---
# API Design Rules

## REST API Structure

### Base URL
```
http://localhost:3000/api/v1
```

### Endpoints

#### Configuration
```
GET    /config                    # Get current configuration
PUT    /config                    # Update configuration
```

#### Connections
```
GET    /connections               # List all connections
POST   /connections               # Create new connection
GET    /connections/:id           # Get single connection
PUT    /connections/:id           # Update connection
DELETE /connections/:id           # Delete connection
POST   /connections/:id/activate  # Activate (subscribe)
POST   /connections/:id/deactivate # Deactivate (unsubscribe)
POST   /connections/activate-all  # Activate all connections
```

#### Sessions
```
GET    /sessions                  # List available sessions
POST   /sessions                  # Create new session
GET    /sessions/:name            # Load session
PUT    /sessions/:name            # Save session
DELETE /sessions/:name            # Delete session
```

#### Tree Navigation
```
GET    /tree                      # Get root nodes
GET    /tree/:path                # Get element at path
POST   /tree/:path/expand         # Expand node, get children
GET    /tree/:path/details        # Get element details
```

#### Status
```
GET    /status                    # Get service status
GET    /status/ember              # Ember+ connection status
GET    /status/osc                # OSC status
```

## Response Format

### Success Response
```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}
```

### Error Response
```typescript
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}
```

### Examples

```json
// GET /connections/:id - Success
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "emberPath": "1.2.3.4",
    "oscAddress": "/fader/1/volume",
    "parameterType": "INTEGER",
    "emberMin": 0,
    "emberMax": 1000,
    "oscMin": 0,
    "oscMax": 1,
    "curve": "log",
    "isActive": true,
    "currentEmberValue": 500,
    "direction": "idle"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}

// POST /connections - Error
{
  "success": false,
  "error": {
    "code": "INVALID_PATH",
    "message": "Ember+ path not found",
    "details": { "path": "1.2.3.999" }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## WebSocket Protocol

### Connection
```
ws://localhost:3000/ws
```

### Message Types

#### Client → Server
```typescript
// Subscribe to updates
{ "type": "subscribe", "topics": ["connections", "status", "logs"] }

// Unsubscribe
{ "type": "unsubscribe", "topics": ["logs"] }

// Ping (keepalive)
{ "type": "ping" }
```

#### Server → Client
```typescript
// Batched connection updates (every 100ms during activity)
{
  "type": "connections:update",
  "data": {
    "550e8400-e29b-41d4-a716-446655440000": {
      "emberValue": 500,
      "direction": "ember-to-osc"
    },
    "660e8400-e29b-41d4-a716-446655440001": {
      "oscValue": 0.75,
      "direction": "osc-to-ember"
    }
  },
  "timestamp": 1705315800000
}

// Status update
{
  "type": "status:update",
  "data": {
    "ember": { "connected": true, "host": "192.168.1.100", "port": 9000 },
    "oscRx": { "listening": true, "port": 8000 },
    "oscTx": { "host": "192.168.1.200", "port": 9000 }
  },
  "timestamp": 1705315800000
}

// Log messages (batched)
{
  "type": "logs:batch",
  "data": [
    { "level": "info", "message": "Connected to Ember+", "timestamp": 1705315800000 },
    { "level": "debug", "message": "Subscribed to 1.2.3.4", "timestamp": 1705315800100 }
  ]
}

// Pong (keepalive response)
{ "type": "pong" }
```

## HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success (GET, PUT) |
| 201 | Created (POST) |
| 204 | No Content (DELETE) |
| 400 | Bad Request (validation error) |
| 404 | Not Found (resource doesn't exist) |
| 409 | Conflict (duplicate, already active) |
| 500 | Internal Server Error |
| 503 | Service Unavailable (Ember+ disconnected) |

## Validation

```typescript
// Use Zod for request validation
import { z } from 'zod';

const ConnectionConfigSchema = z.object({
  emberPath: z.string().regex(/^\d+(\.\d+)*$/),
  oscAddress: z.string().startsWith('/'),
  emberMin: z.number().optional(),
  emberMax: z.number().optional(),
  oscMin: z.number().default(0),
  oscMax: z.number().default(1),
  curve: z.enum(['lin', 'log']).default('lin')
});
```
