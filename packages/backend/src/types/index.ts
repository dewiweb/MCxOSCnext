/**
 * Core type definitions for MCxOSC Backend
 */

export type ParameterType = 'INTEGER' | 'REAL' | 'BOOLEAN' | 'STRING' | 'ENUM';
export type CurveType = 'lin' | 'log';
export type ScaleMode = 'lin-lin' | 'lin-log' | 'log-lin' | 'log-log';
export type Direction = 'idle' | 'ember-to-osc' | 'osc-to-ember';

/**
 * Connection configuration (user-defined settings)
 *
 * emberIdentifierPath is the stable reference (e.g. "_2._1._3._682._683").
 * It is persisted in sessions and resolved to a numeric emberPath at activation time.
 * emberPath is a runtime cache — never persisted. For legacy connections without
 * identifiers, emberPath is used directly as-is.
 */
export interface ConnectionConfig {
  emberPath?: string;
  emberIdentifierPath?: string;
  oscAddress: string;
  parameterType?: ParameterType;
  emberMin?: number;
  emberMax?: number;
  oscMin?: number;
  oscMax?: number;
  factor?: number;
  curve?: CurveType;
  scaleMode?: ScaleMode;
  enumValues?: string[];
}

/**
 * Runtime state of a connection (managed by backend)
 */
export interface ConnectionRuntimeState {
  currentEmberValue: unknown;
  currentOscValue: unknown;
  direction: Direction;
  lastActivity: number;
  isSubscribed: boolean;
  isActive: boolean;
  error?: string;
}

/**
 * Complete connection object (config + runtime state)
 */
export interface Connection extends ConnectionConfig, ConnectionRuntimeState {
  id: string;
  emberPath: string;
  parameterType: ParameterType;
  emberMin: number;
  emberMax: number;
  oscMin: number;
  oscMax: number;
  factor: number;
  curve: CurveType;
  scaleMode: ScaleMode;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Session file format (new version)
 */
export interface SessionFile {
  version: string;
  metadata?: {
    name?: string;
    createdAt?: string;
    updatedAt?: string;
    migratedFrom?: string;
  };
  connections: ConnectionConfig[];
}

/**
 * Legacy session format (for backward compatibility)
 */
export interface LegacyConnection {
  path: string;
  factor: string;
  address: string;
  type: string;
  math: string;
  min: string;
  max: string;
}

/**
 * Application configuration
 */
export interface AppConfig {
  ember: {
    host: string;
    port: number;
    autoConnect: boolean;
    reconnectInterval: number;
  };
  osc: {
    rxPort: number;
    txHost: string;
    txPort: number;
  };
  session: {
    autoLoad?: string;
    autoSaveInterval: number;
    persistPath: string;
  };
  bridge: {
    rateLimit: number;
    directionResetDelay: number;
    autoActivateOnLoad: boolean;
  };
  server: {
    port: number;
    host: string;
  };
}

/**
 * Status information
 */
export interface ServiceStatus {
  ember: {
    connected: boolean;
    host?: string;
    port?: number;
    error?: string;
  };
  oscRx: {
    listening: boolean;
    port?: number;
    error?: string;
  };
  oscTx: {
    host?: string;
    port?: number;
  };
}

/**
 * WebSocket message types
 */
export interface WsMessage {
  type: string;
  data?: unknown;
  timestamp?: number;
}

export interface WsBatchedUpdate {
  type: 'connections:update';
  data: Record<string, Partial<ConnectionRuntimeState>>;
  timestamp: number;
}

/**
 * API response types
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

/**
 * Ember+ Matrix types
 */
export interface MatrixConnection {
  target: number;
  sources: number[];
}

export interface MatrixInfo {
  path: string;
  identifier?: string;
  description?: string;
  targetCount: number;
  sourceCount: number;
  mode?: 'linear' | 'nonLinear';
  targets?: number[];
  sources?: number[];
}

export interface MatrixState extends MatrixInfo {
  connections: MatrixConnection[];
}

export interface MatrixConnectionsPage {
  matrix: MatrixInfo;
  connections: MatrixConnection[];
  pagination: {
    targetOffset: number;
    targetLimit: number;
    totalTargets: number;
  };
}
