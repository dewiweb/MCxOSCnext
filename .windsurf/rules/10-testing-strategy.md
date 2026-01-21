---
trigger: model_decision
---
# Testing Strategy

## Test Structure

```
packages/backend/
├── src/
└── tests/
    ├── unit/
    │   ├── core/
    │   │   ├── ConnectionManager.test.ts
    │   │   ├── BridgeEngine.test.ts
    │   │   └── RateLimiter.test.ts
    │   ├── services/
    │   │   ├── EmberService.test.ts
    │   │   └── OscService.test.ts
    │   └── utils/
    │       └── valueMapper.test.ts
    ├── integration/
    │   ├── api/
    │   │   ├── connections.test.ts
    │   │   └── sessions.test.ts
    │   └── bridge/
    │       └── ember-osc-flow.test.ts
    └── e2e/
        └── full-workflow.test.ts
```

## Unit Tests

### What to Test
- Pure functions (value mapping, type conversion)
- Class methods in isolation
- Error handling paths
- Edge cases

### Example: ConnectionManager

```typescript
// tests/unit/core/ConnectionManager.test.ts
import { ConnectionManager } from '@/core/ConnectionManager';

describe('ConnectionManager', () => {
  let manager: ConnectionManager;
  
  beforeEach(() => {
    manager = new ConnectionManager({ persistPath: ':memory:' });
  });
  
  describe('create()', () => {
    it('should create connection with UUID', () => {
      const conn = manager.create({
        emberPath: '1.2.3.4',
        oscAddress: '/test'
      });
      
      expect(conn.id).toMatch(/^[a-f0-9-]{36}$/);
      expect(conn.emberPath).toBe('1.2.3.4');
    });
    
    it('should emit created event', () => {
      const handler = jest.fn();
      manager.on('created', handler);
      
      manager.create({ emberPath: '1.2.3', oscAddress: '/test' });
      
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('getByEmberPath()', () => {
    it('should find connection by path', () => {
      const created = manager.create({
        emberPath: '1.2.3.4',
        oscAddress: '/test'
      });
      
      const found = manager.getByEmberPath('1.2.3.4');
      
      expect(found?.id).toBe(created.id);
    });
    
    it('should return undefined for unknown path', () => {
      expect(manager.getByEmberPath('9.9.9')).toBeUndefined();
    });
  });
});
```

### Example: Value Mapping

```typescript
// tests/unit/utils/valueMapper.test.ts
import { mapToScale } from '@/utils/valueMapper';

describe('mapToScale', () => {
  describe('linear scaling', () => {
    it('should map value at minimum', () => {
      expect(mapToScale(0, [0, 100], [0, 1], 'lin')).toBe(0);
    });
    
    it('should map value at maximum', () => {
      expect(mapToScale(100, [0, 100], [0, 1], 'lin')).toBe(1);
    });
    
    it('should map midpoint correctly', () => {
      expect(mapToScale(50, [0, 100], [0, 1], 'lin')).toBe(0.5);
    });
  });
  
  describe('logarithmic scaling', () => {
    it('should apply log curve', () => {
      const result = mapToScale(50, [0, 100], [0, 1], 'log');
      expect(result).toBeGreaterThan(0.5);  // Log curve pushes values up
    });
  });
});
```

## Integration Tests

### API Testing

```typescript
// tests/integration/api/connections.test.ts
import request from 'supertest';
import { createApp } from '@/app';

describe('Connections API', () => {
  let app: Express;
  
  beforeAll(async () => {
    app = await createApp({ testMode: true });
  });
  
  describe('POST /api/v1/connections', () => {
    it('should create connection', async () => {
      const res = await request(app)
        .post('/api/v1/connections')
        .send({
          emberPath: '1.2.3.4',
          oscAddress: '/fader/1'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
    });
    
    it('should reject invalid ember path', async () => {
      const res = await request(app)
        .post('/api/v1/connections')
        .send({
          emberPath: 'invalid',
          oscAddress: '/fader/1'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
```

## Mocking Ember+ and OSC

```typescript
// tests/mocks/EmberServiceMock.ts
export class EmberServiceMock {
  private values: Map<string, any> = new Map();
  private callbacks: Map<string, Function> = new Map();
  
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  
  async getElementByPath(path: string) {
    return {
      path,
      contents: {
        type: 'PARAMETER',
        parameterType: 'INTEGER',
        value: this.values.get(path) ?? 0,
        minimum: 0,
        maximum: 100
      }
    };
  }
  
  async subscribe(element: any, callback: Function): Promise<void> {
    this.callbacks.set(element.path, callback);
  }
  
  // Test helper: simulate value change
  simulateValueChange(path: string, value: any): void {
    this.values.set(path, value);
    const cb = this.callbacks.get(path);
    if (cb) cb(value);
  }
}
```

## Test Commands

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Coverage Requirements

| Category | Minimum |
|----------|---------|
| Statements | 80% |
| Branches | 75% |
| Functions | 80% |
| Lines | 80% |

## CI Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
        working-directory: packages/backend
      
      - name: Run tests
        run: npm run test:coverage
        working-directory: packages/backend
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```
