---
trigger: always_on
---
# Architecture Principles

## 1. Backend-Centric Design

The backend is the **source of truth**. The frontend is optional for monitoring.

### DO ✅
- Store all connection state in `ConnectionManager` (backend)
- Process Ember↔OSC translations entirely in backend
- Use UUIDs for connection identifiers
- Auto-persist state to disk

### DON'T ❌
- Store critical data in frontend components
- Rely on frontend to send back data on each operation
- Use row indices as identifiers
- Require frontend to be connected for processing

## 2. Separation of Concerns

Each file should have **one clear responsibility**:

| Component | Responsibility |
|-----------|----------------|
| `EmberService` | Ember+ TCP connection only |
| `OscService` | OSC UDP handling only |
| `BridgeEngine` | Orchestration between protocols |
| `ConnectionManager` | State storage and persistence |
| `RateLimiter` | Timing and anti-feedback |

## 3. File Size Limits

| Metric | Limit |
|--------|-------|
| **Max lines per file** | 250 |
| **Ideal lines per file** | 50-150 |
| **Max functions per file** | 10 |

If a file exceeds these limits, split it.

## 4. Communication Patterns

### Backend ↔ Frontend

| Operation Type | Protocol | Pattern |
|---------------|----------|---------|
| Configuration | REST | Request-Response |
| CRUD operations | REST | Request-Response |
| Real-time updates | WebSocket | Push (batched) |
| Tree navigation | REST | Request-Response |

### Update Batching

- Batch WebSocket updates at **10Hz max** (100ms intervals)
- Only send **changed** values
- Reduce to 1Hz when idle

## 5. Error Handling

- Backend should be resilient to frontend disconnection
- Auto-reconnect for Ember+ connection loss
- Log errors but continue operation when possible
- Never crash on protocol errors
