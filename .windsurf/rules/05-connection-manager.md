---
trigger: always_on
---
# ConnectionManager Rules

## Purpose

`ConnectionManager` is the **single source of truth** for all connection state.

## Connection Interface

```typescript
interface Connection {
  // Identifiers
  id: string;                    // UUID - stable, never changes
  
  // Mapping configuration
  emberPath: string;             // e.g., "1.2.3.4"
  oscAddress: string;            // e.g., "/fader/1/volume"
  
  // Value scaling
  emberMin: number;
  emberMax: number;
  oscMin: number;
  oscMax: number;
  factor: number;                // Ember+ factor for integer values
  curve: 'lin' | 'log';
  
  // Type information
  parameterType: ParameterType;
  enumValues?: string[];         // For ENUM type
  
  // Runtime state
  currentEmberValue: any;
  currentOscValue: any;
  direction: 'idle' | 'ember-to-osc' | 'osc-to-ember';
  lastActivity: number;          // Timestamp
  isSubscribed: boolean;
  isActive: boolean;             // Connection activated
  error?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

## CRUD Operations

```typescript
class ConnectionManager extends EventEmitter {
  private connections: Map<string, Connection> = new Map();
  
  // Create with UUID
  create(config: ConnectionConfig): Connection {
    const id = uuidv4();
    const connection: Connection = {
      id,
      ...config,
      currentEmberValue: null,
      currentOscValue: null,
      direction: 'idle',
      lastActivity: 0,
      isSubscribed: false,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.connections.set(id, connection);
    this.emit('created', connection);
    this.schedulePersist();
    return connection;
  }
  
  // Update preserves runtime state
  update(id: string, changes: Partial<ConnectionConfig>): Connection {
    const conn = this.connections.get(id);
    if (!conn) throw new Error(`Connection ${id} not found`);
    
    Object.assign(conn, changes, { updatedAt: new Date() });
    this.emit('updated', conn);
    this.schedulePersist();
    return conn;
  }
  
  // Delete triggers cleanup
  delete(id: string): void {
    const conn = this.connections.get(id);
    if (conn) {
      this.emit('deleting', conn);  // Allow cleanup
      this.connections.delete(id);
      this.emit('deleted', id);
      this.schedulePersist();
    }
  }
}
```

## Lookup Methods

```typescript
// Fast lookups with indexes
class ConnectionManager {
  private byEmberPath: Map<string, string> = new Map();  // path -> id
  private byOscAddress: Map<string, Set<string>> = new Map();  // address -> ids
  
  getByEmberPath(path: string): Connection | undefined {
    const id = this.byEmberPath.get(path);
    return id ? this.connections.get(id) : undefined;
  }
  
  getByOscAddress(address: string): Connection[] {
    const ids = this.byOscAddress.get(address);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.connections.get(id))
      .filter(Boolean) as Connection[];
  }
}
```

## Persistence

```typescript
class ConnectionManager {
  private persistPath: string;
  private persistTimer: NodeJS.Timeout | null = null;
  private readonly PERSIST_DELAY = 5000;  // 5 seconds debounce
  
  private schedulePersist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => this.persist(), this.PERSIST_DELAY);
  }
  
  private async persist(): Promise<void> {
    const data = this.exportSession();
    await fs.writeFile(this.persistPath, JSON.stringify(data, null, 2));
  }
  
  async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.persistPath, 'utf-8');
      this.importSession(JSON.parse(data));
    } catch (error) {
      // No saved state - start fresh
    }
  }
}
```

## Session Import/Export

```typescript
// Compatible with legacy .session files
interface SessionFile {
  connections: SessionConnection[];
  metadata?: {
    version: string;
    savedAt: string;
  };
}

importSession(session: SessionFile): void {
  this.connections.clear();
  for (const conn of session.connections) {
    this.create(conn);  // Generates new UUIDs
  }
}

exportSession(): SessionFile {
  return {
    connections: this.getAll().map(c => ({
      emberPath: c.emberPath,
      oscAddress: c.oscAddress,
      // ... other config fields
    })),
    metadata: {
      version: '2.0',
      savedAt: new Date().toISOString()
    }
  };
}
```

## Events

```typescript
// ConnectionManager extends EventEmitter
connectionManager.on('created', (conn) => {});
connectionManager.on('updated', (conn) => {});
connectionManager.on('deleting', (conn) => {});  // Before delete
connectionManager.on('deleted', (id) => {});    // After delete
connectionManager.on('stateChanged', (id, state) => {});  // Runtime state
```
