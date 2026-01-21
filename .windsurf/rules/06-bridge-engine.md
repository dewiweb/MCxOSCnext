---
trigger: always_on
---
# BridgeEngine Rules

## Purpose

`BridgeEngine` orchestrates the bidirectional translation between Ember+ and OSC.

## Core Responsibilities

1. **Ember+ → OSC translation**
2. **OSC → Ember+ translation**
3. **Rate limiting** (anti-feedback loop)
4. **Direction management**
5. **Value mapping**

## Implementation

```typescript
class BridgeEngine {
  constructor(
    private connectionManager: ConnectionManager,
    private emberService: EmberService,
    private oscService: OscService,
    private rateLimiter: RateLimiter,
    private updateBatcher: UpdateBatcher
  ) {
    this.setupListeners();
  }
  
  private setupListeners(): void {
    // Listen for Ember+ value changes
    this.emberService.on('valueChange', this.handleEmberUpdate.bind(this));
    
    // Listen for OSC messages
    this.oscService.on('message', this.handleOscMessage.bind(this));
    
    // Listen for connection deletions
    this.connectionManager.on('deleting', this.handleConnectionDelete.bind(this));
  }
}
```

## Ember+ → OSC Flow

```typescript
private handleEmberUpdate(path: string, value: any): void {
  const conn = this.connectionManager.getByEmberPath(path);
  if (!conn || !conn.isActive) return;
  
  // 1. Rate limiting check
  if (!this.rateLimiter.canProcess(conn.id, 'ember')) {
    return;  // Too soon, skip this update
  }
  
  // 2. Direction conflict check
  if (conn.direction === 'osc-to-ember') {
    return;  // OSC is controlling, don't echo back
  }
  
  // 3. Update internal state (no IPC!)
  this.connectionManager.updateRuntimeState(conn.id, {
    currentEmberValue: value,
    direction: 'ember-to-osc',
    lastActivity: Date.now()
  });
  
  // 4. Map value
  const oscValue = this.mapValue(value, conn, 'ember-to-osc');
  
  // 5. Send OSC
  this.oscService.send(conn.oscAddress, oscValue, conn.parameterType);
  
  // 6. Queue UI update (batched)
  this.updateBatcher.queue(conn.id, { emberValue: value, direction: 'ember-to-osc' });
  
  // 7. Schedule direction reset
  this.rateLimiter.scheduleReset(conn.id, 500);
}
```

## OSC → Ember+ Flow

```typescript
private handleOscMessage(address: string, args: OscArg[]): void {
  const connections = this.connectionManager.getByOscAddress(address);
  
  for (const conn of connections) {
    if (!conn.isActive) continue;
    
    // 1. Rate limiting check
    if (!this.rateLimiter.canProcess(conn.id, 'osc')) continue;
    
    // 2. Direction conflict check
    if (conn.direction === 'ember-to-osc') continue;
    
    // 3. Update internal state
    this.connectionManager.updateRuntimeState(conn.id, {
      currentOscValue: args[0].value,
      direction: 'osc-to-ember',
      lastActivity: Date.now()
    });
    
    // 4. Map value
    const emberValue = this.mapValue(args[0].value, conn, 'osc-to-ember');
    
    // 5. Send to Ember+
    this.emberService.setValue(conn.emberPath, emberValue);
    
    // 6. Queue UI update
    this.updateBatcher.queue(conn.id, { oscValue: args[0].value, direction: 'osc-to-ember' });
    
    // 7. Schedule direction reset
    this.rateLimiter.scheduleReset(conn.id, 500);
  }
}
```

## Value Mapping

```typescript
private mapValue(
  value: any,
  conn: Connection,
  direction: 'ember-to-osc' | 'osc-to-ember'
): any {
  // Handle non-numeric types
  if (conn.parameterType === 'BOOLEAN') {
    return Boolean(value);
  }
  if (conn.parameterType === 'STRING') {
    return String(value);
  }
  
  // Numeric mapping
  const numValue = Number(value);
  
  if (direction === 'ember-to-osc') {
    return mapToScale(
      numValue,
      [conn.emberMin, conn.emberMax],
      [conn.oscMin, conn.oscMax],
      conn.curve
    );
  } else {
    return mapToScale(
      numValue,
      [conn.oscMin, conn.oscMax],
      [conn.emberMin, conn.emberMax],
      conn.curve
    );
  }
}
```

## Connection Activation

```typescript
async activateConnection(id: string): Promise<void> {
  const conn = this.connectionManager.get(id);
  if (!conn) throw new Error(`Connection ${id} not found`);
  
  try {
    // Get element and validate
    const element = await this.emberService.getElementByPath(conn.emberPath);
    
    // Subscribe for updates
    await this.emberService.subscribe(element, (value) => {
      this.handleEmberUpdate(conn.emberPath, value);
    });
    
    // Update state
    this.connectionManager.updateRuntimeState(id, {
      isSubscribed: true,
      isActive: true,
      error: undefined
    });
    
  } catch (error) {
    this.connectionManager.updateRuntimeState(id, {
      isActive: false,
      error: error.message
    });
    throw error;
  }
}

async activateAllConnections(): Promise<void> {
  const connections = this.connectionManager.getAll();
  
  // Activate in parallel with error handling
  await Promise.allSettled(
    connections.map(c => this.activateConnection(c.id))
  );
}
```

## Connection Cleanup

```typescript
private async handleConnectionDelete(conn: Connection): Promise<void> {
  if (conn.isSubscribed) {
    try {
      const element = await this.emberService.getElementByPath(conn.emberPath);
      await this.emberService.unsubscribe(element);
    } catch {
      // Element may not exist anymore
    }
  }
}
```
