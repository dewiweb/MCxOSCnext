import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import type {
  Connection,
  ConnectionConfig,
  ConnectionRuntimeState,
  SessionFile,
  LegacyConnection,
  ParameterType,
} from '../types/index.js';

/**
 * ConnectionManager - Single source of truth for all connection state.
 * Handles CRUD operations, persistence, and lookup indexes.
 */
export class ConnectionManager extends EventEmitter {
  private connections: Map<string, Connection> = new Map();
  private byEmberPath: Map<string, string> = new Map();
  private byOscAddress: Map<string, Set<string>> = new Map();
  private persistPath: string;
  private persistTimer: NodeJS.Timeout | null = null;
  private readonly PERSIST_DELAY = 5000;

  constructor(options: { persistPath: string }) {
    super();
    this.persistPath = options.persistPath;
  }

  create(config: ConnectionConfig): Connection {
    const id = uuidv4();
    const now = new Date();

    const connection: Connection = {
      id,
      emberPath: config.emberPath ?? '',
      emberIdentifierPath: config.emberIdentifierPath,
      oscAddress: config.oscAddress,
      parameterType: config.parameterType ?? 'INTEGER',
      emberMin: config.emberMin ?? 0,
      emberMax: config.emberMax ?? 100,
      oscMin: config.oscMin ?? 0,
      oscMax: config.oscMax ?? 1,
      factor: config.factor ?? 1,
      curve: config.curve ?? 'lin',
      enumValues: config.enumValues,
      currentEmberValue: null,
      currentOscValue: null,
      direction: 'idle',
      lastActivity: 0,
      isSubscribed: false,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    };

    this.connections.set(id, connection);
    this.addToIndexes(connection);
    this.emit('created', connection);
    this.schedulePersist();

    return connection;
  }

  update(id: string, changes: Partial<ConnectionConfig>): Connection {
    const conn = this.connections.get(id);
    if (!conn) {
      throw new Error(`Connection ${id} not found`);
    }

    const oldEmberPath = conn.emberPath;
    const oldOscAddress = conn.oscAddress;

    Object.assign(conn, changes, { updatedAt: new Date() });

    if (changes.emberPath !== undefined && changes.emberPath !== oldEmberPath) {
      this.byEmberPath.delete(oldEmberPath);
      if (changes.emberPath) this.byEmberPath.set(changes.emberPath, id);
    }
    if (changes.oscAddress && changes.oscAddress !== oldOscAddress) {
      this.removeFromOscIndex(oldOscAddress, id);
      this.addToOscIndex(changes.oscAddress, id);
    }

    this.emit('updated', conn);
    this.schedulePersist();

    return conn;
  }

  updateRuntimeState(id: string, state: Partial<ConnectionRuntimeState>): void {
    const conn = this.connections.get(id);
    if (!conn) return;

    Object.assign(conn, state);
    this.emit('stateChanged', id, state);
  }

  delete(id: string): void {
    const conn = this.connections.get(id);
    if (!conn) return;

    this.emit('deleting', conn);
    this.removeFromIndexes(conn);
    this.connections.delete(id);
    this.emit('deleted', id);
    this.schedulePersist();
  }

  get(id: string): Connection | undefined {
    return this.connections.get(id);
  }

  getAll(): Connection[] {
    return Array.from(this.connections.values());
  }

  getByEmberPath(path: string): Connection | undefined {
    const id = this.byEmberPath.get(path);
    return id ? this.connections.get(id) : undefined;
  }

  getByOscAddress(address: string): Connection[] {
    const ids = this.byOscAddress.get(address);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.connections.get(id))
      .filter((c): c is Connection => c !== undefined);
  }

  importSession(session: SessionFile | LegacyConnection[]): void {
    this.connections.clear();
    this.byEmberPath.clear();
    this.byOscAddress.clear();

    const connections = Array.isArray(session)
      ? this.migrateLegacySession(session)
      : session.connections;

    for (const config of connections) {
      this.create(config);
    }
  }

  exportSession(): SessionFile {
    return {
      version: '2.0',
      metadata: {
        updatedAt: new Date().toISOString(),
      },
      connections: this.getAll().map((c) => ({
        // emberIdentifierPath is the stable reference — persisted always if present.
        // emberPath is only persisted for legacy connections without an identifierPath.
        emberPath: c.emberIdentifierPath ? undefined : c.emberPath,
        emberIdentifierPath: c.emberIdentifierPath,
        oscAddress: c.oscAddress,
        parameterType: c.parameterType,
        emberMin: c.emberMin,
        emberMax: c.emberMax,
        oscMin: c.oscMin,
        oscMax: c.oscMax,
        factor: c.factor,
        curve: c.curve,
        enumValues: c.enumValues,
      })),
    };
  }

  exportLegacySession(): unknown[] {
    return this.getAll().map((c) => ({
      path: c.emberPath,
      address: c.oscAddress,
      type: c.parameterType === 'INTEGER' ? 'Integer' : 
            c.parameterType === 'REAL' ? 'Real' :
            c.parameterType === 'BOOLEAN' ? 'Boolean' :
            c.parameterType === 'STRING' ? 'String' : 'Enum',
      math: c.curve,
      min: `${c.emberMin}/${c.oscMin}`,
      max: `${c.emberMax}/${c.oscMax}`,
      factor: String(c.factor),
    }));
  }

  async persist(): Promise<void> {
    if (this.persistPath === ':memory:') return;

    const data = this.exportSession();
    await fs.writeFile(this.persistPath, JSON.stringify(data, null, 2));
  }

  async load(): Promise<void> {
    if (this.persistPath === ':memory:') return;

    try {
      const content = await fs.readFile(this.persistPath, 'utf-8');
      const data = JSON.parse(content);
      this.importSession(data);
    } catch {
      // No saved state - start fresh
    }
  }

  private schedulePersist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => this.persist(), this.PERSIST_DELAY);
  }

  private addToIndexes(conn: Connection): void {
    this.byEmberPath.set(conn.emberPath, conn.id);
    this.addToOscIndex(conn.oscAddress, conn.id);
  }

  private removeFromIndexes(conn: Connection): void {
    this.byEmberPath.delete(conn.emberPath);
    this.removeFromOscIndex(conn.oscAddress, conn.id);
  }

  private addToOscIndex(address: string, id: string): void {
    if (!this.byOscAddress.has(address)) {
      this.byOscAddress.set(address, new Set());
    }
    this.byOscAddress.get(address)!.add(id);
  }

  private removeFromOscIndex(address: string, id: string): void {
    const ids = this.byOscAddress.get(address);
    if (ids) {
      ids.delete(id);
      if (ids.size === 0) {
        this.byOscAddress.delete(address);
      }
    }
  }

  private migrateLegacySession(legacy: LegacyConnection[]): ConnectionConfig[] {
    return legacy.map((conn) => {
      const [emberMin, oscMin] = conn.min.split('/').map(Number);
      const [emberMax, oscMax] = conn.max.split('/').map(Number);

      return {
        emberPath: conn.path,
        oscAddress: conn.address,
        parameterType: this.normalizeType(conn.type),
        factor: conn.factor ? Number(conn.factor) : 1,
        curve: (conn.math as 'lin' | 'log') || 'lin',
        emberMin: isNaN(emberMin) ? 0 : emberMin,
        emberMax: isNaN(emberMax) ? 100 : emberMax,
        oscMin: isNaN(oscMin) ? 0 : oscMin,
        oscMax: isNaN(oscMax) ? 1 : oscMax,
      };
    });
  }

  private normalizeType(type: string): ParameterType {
    const typeMap: Record<string, ParameterType> = {
      Integer: 'INTEGER',
      Real: 'REAL',
      Boolean: 'BOOLEAN',
      String: 'STRING',
      Enum: 'ENUM',
    };
    return typeMap[type] || 'INTEGER';
  }
}
