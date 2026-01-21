---
trigger: model_decision
---
# Session File Compatibility

## Legacy Session Format

The original Electron app uses `.session` files in JSON array format:

```json
[
  {
    "path": "1.2.3.4",
    "factor": "1",
    "address": "/fader/1/volume",
    "type": "Integer",
    "math": "lin",
    "min": "0/0",
    "max": "1000/1"
  },
  {
    "path": "1.2.3.5",
    "factor": "",
    "address": "/fader/1/pan",
    "type": "Real",
    "math": "lin",
    "min": "-1/0",
    "max": "1/1"
  }
]
```

## New Session Format

```json
{
  "version": "2.0",
  "metadata": {
    "name": "My Session",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T12:30:00Z"
  },
  "connections": [
    {
      "emberPath": "1.2.3.4",
      "oscAddress": "/fader/1/volume",
      "parameterType": "INTEGER",
      "factor": 1,
      "curve": "lin",
      "emberMin": 0,
      "emberMax": 1000,
      "oscMin": 0,
      "oscMax": 1
    }
  ]
}
```

## Migration Function

```typescript
// src/utils/sessionMigration.ts

interface LegacyConnection {
  path: string;
  factor: string;
  address: string;
  type: string;
  math: string;
  min: string;  // "emberMin/oscMin"
  max: string;  // "emberMax/oscMax"
}

interface ModernConnection {
  emberPath: string;
  oscAddress: string;
  parameterType: ParameterType;
  factor: number;
  curve: 'lin' | 'log';
  emberMin: number;
  emberMax: number;
  oscMin: number;
  oscMax: number;
}

function migrateLegacySession(legacy: LegacyConnection[]): ModernConnection[] {
  return legacy.map(conn => {
    const [emberMin, oscMin] = conn.min.split('/').map(Number);
    const [emberMax, oscMax] = conn.max.split('/').map(Number);
    
    return {
      emberPath: conn.path,
      oscAddress: conn.address,
      parameterType: normalizeType(conn.type),
      factor: conn.factor ? Number(conn.factor) : 1,
      curve: conn.math as 'lin' | 'log',
      emberMin,
      emberMax,
      oscMin,
      oscMax
    };
  });
}

function normalizeType(type: string): ParameterType {
  const typeMap: Record<string, ParameterType> = {
    'Integer': 'INTEGER',
    'Real': 'REAL',
    'Boolean': 'BOOLEAN',
    'String': 'STRING',
    'Enum': 'ENUM'
  };
  return typeMap[type] || 'INTEGER';
}
```

## Auto-Detection

```typescript
function loadSession(filePath: string): SessionFile {
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  
  // Detect format
  if (Array.isArray(data)) {
    // Legacy format
    return {
      version: '1.0',
      connections: migrateLegacySession(data),
      metadata: {
        migratedFrom: 'legacy',
        originalPath: filePath
      }
    };
  }
  
  // Modern format
  return data as SessionFile;
}
```

## Export Options

```typescript
// API: GET /api/v1/sessions/:name?format=legacy
async function exportSession(name: string, format: 'modern' | 'legacy') {
  const session = await sessionManager.get(name);
  
  if (format === 'legacy') {
    return session.connections.map(conn => ({
      path: conn.emberPath,
      factor: String(conn.factor),
      address: conn.oscAddress,
      type: denormalizeType(conn.parameterType),
      math: conn.curve,
      min: `${conn.emberMin}/${conn.oscMin}`,
      max: `${conn.emberMax}/${conn.oscMax}`
    }));
  }
  
  return session;
}
```

## Backward Compatibility Rules

1. **Always support reading legacy format**
2. **Default to modern format for new saves**
3. **Provide export option for legacy format**
4. **Preserve unknown fields when migrating**
5. **Log warnings for deprecated features**

## File Extension Convention

| Extension | Format |
|-----------|--------|
| `.session` | Legacy (array) or Modern (detected) |
| `.mcxosc` | Modern format only (recommended) |
