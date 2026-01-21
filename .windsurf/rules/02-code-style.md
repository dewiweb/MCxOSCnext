---
trigger: always_on
---
# Code Style Guidelines

## 1. Language & Typing

- **Backend**: TypeScript (strict mode)
- **Frontend**: TypeScript + React
- **No `any` types** unless absolutely necessary (document why)

```typescript
// ✅ Good
function mapValue(value: number, config: ConnectionConfig): number

// ❌ Bad
function mapValue(value: any, config: any): any
```

## 2. Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files (classes) | PascalCase | `ConnectionManager.ts` |
| Files (utilities) | camelCase | `valueMapper.ts` |
| Classes | PascalCase | `class BridgeEngine` |
| Interfaces | PascalCase + prefix I optional | `interface Connection` |
| Functions | camelCase | `handleEmberUpdate()` |
| Constants | UPPER_SNAKE_CASE | `const MAX_CONNECTIONS = 100` |
| Variables | camelCase | `let currentValue` |

## 3. Import Organization

```typescript
// 1. Node.js built-ins
import { EventEmitter } from 'events';
import * as path from 'path';

// 2. External packages
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

// 3. Internal modules (absolute paths preferred)
import { ConnectionManager } from '@/core/ConnectionManager';
import { EmberService } from '@/services/ember/EmberService';

// 4. Types (if separate)
import type { Connection, ConnectionConfig } from '@/types';
```

## 4. Comments

- **Do NOT add excessive comments** - code should be self-documenting
- **Do NOT remove existing comments** unless explicitly asked
- Add JSDoc for public APIs only

```typescript
/**
 * Creates a new Ember+ to OSC connection mapping.
 * @param config - Connection configuration
 * @returns The created connection with generated UUID
 */
create(config: ConnectionConfig): Connection;
```

## 5. Error Messages

Use descriptive error messages with context:

```typescript
// ✅ Good
throw new Error(`Failed to connect to Ember+ at ${host}:${port}: ${error.message}`);

// ❌ Bad
throw new Error('Connection failed');
```

## 6. Async/Await

- Prefer `async/await` over `.then()` chains
- Always handle errors with try/catch
- Use `Promise.all()` for parallel operations

```typescript
// ✅ Good
try {
  const [emberResult, oscResult] = await Promise.all([
    emberService.connect(),
    oscService.start()
  ]);
} catch (error) {
  logger.error('Failed to initialize services', error);
}
```
