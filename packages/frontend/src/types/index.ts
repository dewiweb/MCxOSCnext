export type ParameterType = 'INTEGER' | 'REAL' | 'BOOLEAN' | 'STRING' | 'ENUM';
export type CurveType = 'lin' | 'log';
export type Direction = 'idle' | 'ember-to-osc' | 'osc-to-ember';

export interface Connection {
  id: string;
  emberPath: string;
  oscAddress: string;
  parameterType: ParameterType;
  emberMin: number;
  emberMax: number;
  oscMin: number;
  oscMax: number;
  factor: number;
  curve: CurveType;
  enumValues?: string[];
  currentEmberValue: unknown;
  currentOscValue: unknown;
  direction: Direction;
  lastActivity: number;
  isSubscribed: boolean;
  isActive: boolean;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionConfig {
  emberPath: string;
  oscAddress: string;
  parameterType?: ParameterType;
  emberMin?: number;
  emberMax?: number;
  oscMin?: number;
  oscMax?: number;
  factor?: number;
  curve?: CurveType;
}

export interface ConnectionRuntimeState {
  emberValue?: unknown;
  oscValue?: unknown;
  direction?: Direction;
  isActive?: boolean;
  error?: string;
}

export interface ServiceStatus {
  ember: {
    connected: boolean;
    host?: string;
    port?: number;
  };
  oscRx: {
    listening: boolean;
    port?: number;
  };
  oscTx: {
    host?: string;
    port?: number;
  };
  connections?: {
    total: number;
    active: number;
  };
}

export interface TreeNode {
  path: string;
  number?: number;
  type: string;
  description?: string;
  identifier?: string;
  value?: unknown;
  parameterType?: string;
  minimum?: number;
  maximum?: number;
  factor?: number;
  hasChildren: boolean;
  isMatrix?: boolean;
  isFunction?: boolean;
}

export interface Session {
  name: string;
  filename: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface WsMessage {
  type: string;
  data?: unknown;
  timestamp?: number;
}

export interface AppConfig {
  ember: {
    host: string;
    port: number;
    autoConnect: boolean;
  };
  osc: {
    rxPort: number;
    txHost: string;
    txPort: number;
  };
  server?: {
    port: number;
  };
}
