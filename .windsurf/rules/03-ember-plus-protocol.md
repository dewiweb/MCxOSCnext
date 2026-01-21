---
trigger: always_on
---
# Ember+ Protocol Rules

## Critical: Dependency Version

```json
"emberplus-connection": "0.2.1-nightly-master-20230414-132419-ee926d2.0"
```

**NEVER change this version.** It is a patched nightly build required for specific functionality.

## Ember+ Concepts

### Tree Structure
- Ember+ uses a hierarchical tree of nodes and parameters
- Paths are dot-separated numbers: `1.2.3.4`
- Nodes contain children, Parameters contain values

### Element Types

| Type | Description | Bridgeable |
|------|-------------|------------|
| `NODE` | Container for children | ❌ No |
| `PARAMETER` | Value holder | ✅ Yes |
| `MATRIX` | Crosspoint matrix | ⚠️ Partial |
| `FUNCTION` | Callable action | ⚠️ Invoke only |

### Parameter Types

| Type | OSC Mapping |
|------|-------------|
| `INTEGER` | Float with scaling |
| `REAL` | Float direct |
| `BOOLEAN` | True/False messages |
| `STRING` | String message |
| `ENUM` | Integer index |

## EmberService Implementation

```typescript
class EmberService {
  // Connection management
  async connect(host: string, port: number): Promise<void>;
  async disconnect(): Promise<void>;
  
  // Tree navigation
  async getElementByPath(path: string): Promise<EmberElement>;
  async getDirectory(node: EmberNode): Promise<EmberElement[]>;
  
  // Value operations
  async subscribe(element: EmberElement, callback: ValueCallback): Promise<void>;
  async unsubscribe(element: EmberElement): Promise<void>;
  async setValue(path: string, value: any): Promise<void>;
  
  // Matrix operations (if needed)
  async matrixSetConnection(matrix: EmberMatrix, target: number, sources: number[]): Promise<void>;
}
```

## Subscription Management

- Track active subscriptions in `EmberSubscriptionManager`
- Clean up subscriptions when connections are deleted
- Handle reconnection by resubscribing

```typescript
class EmberSubscriptionManager {
  private subscriptions: Map<string, EmberSubscription> = new Map();
  
  async subscribeForConnection(connectionId: string, emberPath: string): Promise<void>;
  async unsubscribeConnection(connectionId: string): Promise<void>;
  async resubscribeAll(): Promise<void>;  // After reconnect
}
```

## Error Handling

```typescript
// Always catch Ember+ errors
try {
  await emberClient.getElementByPath(path);
} catch (error) {
  if (error.message.includes('not found')) {
    // Path doesn't exist - mark connection as error
    connectionManager.updateRuntimeState(id, { error: 'Path not found' });
  } else {
    // Connection issue - attempt reconnect
    await this.scheduleReconnect();
  }
}
```
