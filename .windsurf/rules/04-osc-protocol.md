---
trigger: always_on
---
# OSC Protocol Rules

## OSC Basics

- **Protocol**: UDP (connectionless)
- **RX Port**: Incoming OSC messages (configurable, default 8000)
- **TX**: Outgoing to target host:port

## OscService Implementation

```typescript
class OscService {
  private udpPort: osc.UDPPort;
  
  // Lifecycle
  async start(rxPort: number): Promise<void>;
  async stop(): Promise<void>;
  
  // Sending
  send(address: string, value: any, type: ParameterType): void;
  
  // Events
  onMessage(callback: (address: string, args: OscArg[]) => void): void;
  onError(callback: (error: Error) => void): void;
}
```

## OSC Address Format

Convert Ember+ path to OSC address:

```typescript
// Ember+ path: "1.2.3.4"
// OSC address: "/1/2/3/4"

function emberPathToOsc(emberPath: string): string {
  return '/' + emberPath.replace(/\./g, '/');
}

// Or use descriptive names from session
// Ember+ path: "1.2.3.4" with description "Fader/Ch1/Volume"
// OSC address: "/Fader/Ch1/Volume"
```

## Type Mappings

| Ember+ Type | OSC Type | Notes |
|-------------|----------|-------|
| INTEGER | `f` (float) | Apply scaling |
| REAL | `f` (float) | Direct |
| BOOLEAN true | `T` | OSC true |
| BOOLEAN false | `F` | OSC false |
| STRING | `s` (string) | Direct |
| ENUM | `f` (float) | Index as float |

## Value Scaling

```typescript
function mapToScale(
  value: number,
  inputRange: [number, number],
  outputRange: [number, number],
  curve: 'lin' | 'log' = 'lin'
): number {
  const [inMin, inMax] = inputRange;
  const [outMin, outMax] = outputRange;
  
  // Normalize to 0-1
  let normalized = (value - inMin) / (inMax - inMin);
  
  if (curve === 'log') {
    // Logarithmic scaling for audio (dB)
    normalized = Math.log10(normalized * 9 + 1);
  }
  
  // Scale to output range
  return outMin + normalized * (outMax - outMin);
}
```

## Message Handling

```typescript
// OscMessageHandler routes messages to connections
class OscMessageHandler {
  constructor(
    private connectionManager: ConnectionManager,
    private bridgeEngine: BridgeEngine
  ) {}
  
  handleMessage(address: string, args: OscArg[]): void {
    // Find all connections matching this address
    const connections = this.connectionManager.getByOscAddress(address);
    
    for (const conn of connections) {
      this.bridgeEngine.processOscToEmber(conn.id, args[0].value);
    }
  }
}
```

## Error Handling

OSC uses UDP - no connection errors, but:

```typescript
// Handle port binding errors
try {
  await oscService.start(port);
} catch (error) {
  if (error.code === 'EADDRINUSE') {
    throw new Error(`Port ${port} already in use`);
  }
  throw error;
}
```
