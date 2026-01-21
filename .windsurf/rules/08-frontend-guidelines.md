---
trigger: always_on
---
# Frontend Guidelines

## Technology Stack

- **Framework**: React 18+ with TypeScript
- **Build**: Vite
- **State**: Zustand (lightweight, no boilerplate)
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui (optional)
- **Icons**: Lucide React

## Frontend Philosophy

The frontend is a **monitoring and configuration dashboard**, NOT a data store.

### DO ✅
- Display connection state from WebSocket
- Send configuration changes via REST API
- Handle reconnection gracefully
- Batch UI updates for performance

### DON'T ❌
- Store critical data that backend needs
- Expect UI to always be connected
- Send data on every value change
- Block UI on backend operations

## Component Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── StatusBar.tsx
│   ├── connections/
│   │   ├── ConnectionTable.tsx
│   │   ├── ConnectionRow.tsx
│   │   └── ConnectionForm.tsx
│   ├── tree/
│   │   ├── TreeView.tsx
│   │   └── TreeNode.tsx
│   └── common/
│       ├── Button.tsx
│       └── Input.tsx
├── hooks/
│   ├── useWebSocket.ts
│   ├── useConnections.ts
│   └── useConfig.ts
├── stores/
│   ├── connectionStore.ts
│   └── uiStore.ts
├── services/
│   └── api.ts
└── types/
    └── index.ts
```

## State Management

```typescript
// stores/connectionStore.ts
import { create } from 'zustand';

interface ConnectionStore {
  connections: Map<string, Connection>;
  
  // Actions
  setConnections: (connections: Connection[]) => void;
  updateConnection: (id: string, changes: Partial<Connection>) => void;
  
  // Batch updates from WebSocket
  applyBatchUpdate: (updates: Record<string, Partial<ConnectionState>>) => void;
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  connections: new Map(),
  
  setConnections: (connections) => set({
    connections: new Map(connections.map(c => [c.id, c]))
  }),
  
  updateConnection: (id, changes) => set((state) => {
    const conn = state.connections.get(id);
    if (!conn) return state;
    state.connections.set(id, { ...conn, ...changes });
    return { connections: new Map(state.connections) };
  }),
  
  applyBatchUpdate: (updates) => set((state) => {
    for (const [id, changes] of Object.entries(updates)) {
      const conn = state.connections.get(id);
      if (conn) {
        state.connections.set(id, { ...conn, ...changes });
      }
    }
    return { connections: new Map(state.connections) };
  })
}));
```

## WebSocket Hook

```typescript
// hooks/useWebSocket.ts
export function useWebSocket() {
  const applyBatchUpdate = useConnectionStore(s => s.applyBatchUpdate);
  
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3000/ws');
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ 
        type: 'subscribe', 
        topics: ['connections', 'status'] 
      }));
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'connections:update':
          applyBatchUpdate(message.data);
          break;
        case 'status:update':
          // Handle status update
          break;
      }
    };
    
    ws.onclose = () => {
      // Reconnect after delay
      setTimeout(() => reconnect(), 2000);
    };
    
    return () => ws.close();
  }, []);
}
```

## API Service

```typescript
// services/api.ts
const API_BASE = '/api/v1';

export const api = {
  // Connections
  async getConnections(): Promise<Connection[]> {
    const res = await fetch(`${API_BASE}/connections`);
    const data = await res.json();
    return data.data;
  },
  
  async createConnection(config: ConnectionConfig): Promise<Connection> {
    const res = await fetch(`${API_BASE}/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error.message);
    return data.data;
  },
  
  async activateConnection(id: string): Promise<void> {
    await fetch(`${API_BASE}/connections/${id}/activate`, { method: 'POST' });
  },
  
  // Sessions
  async loadSession(name: string): Promise<void> {
    await fetch(`${API_BASE}/sessions/${name}`, { method: 'GET' });
  },
  
  async saveSession(name: string): Promise<void> {
    await fetch(`${API_BASE}/sessions/${name}`, { method: 'PUT' });
  }
};
```

## Performance Guidelines

1. **Memoize expensive computations**
```typescript
const sortedConnections = useMemo(
  () => [...connections].sort((a, b) => a.emberPath.localeCompare(b.emberPath)),
  [connections]
);
```

2. **Debounce user input**
```typescript
const debouncedSearch = useDebouncedCallback(
  (value) => setSearchTerm(value),
  300
);
```

3. **Virtualize long lists**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

// For connection tables with 100+ rows
```

4. **Avoid unnecessary re-renders**
```typescript
// Use React.memo for row components
const ConnectionRow = memo(({ connection }) => { ... });
```
