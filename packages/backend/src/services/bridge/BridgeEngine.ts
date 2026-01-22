import { EventEmitter } from 'events';
import type { ConnectionManager } from '../../core/ConnectionManager.js';
import type { EmberService } from '../ember/EmberService.js';
import type { OscService, OscArg } from '../osc/OscService.js';
import type { RateLimiter } from '../../core/RateLimiter.js';
import type { UpdateBatcher } from '../../core/UpdateBatcher.js';
import { emberToOsc, oscToEmber } from '../../utils/valueMapper.js';
import { createLogger } from '../../utils/logger.js';
import { parseOscValue } from '../osc/OscService.js';

const logger = createLogger('BridgeEngine');

export interface BridgeEngineConfig {
  directionResetDelay: number;
}

/**
 * BridgeEngine - Orchestrates bidirectional Ember+ ↔ OSC translation.
 * Handles rate limiting, direction management, and value mapping.
 */
export class BridgeEngine extends EventEmitter {
  private connectionManager: ConnectionManager;
  private emberService: EmberService;
  private oscService: OscService;
  private rateLimiter: RateLimiter;
  private updateBatcher: UpdateBatcher;
  private config: BridgeEngineConfig;

  constructor(
    connectionManager: ConnectionManager,
    emberService: EmberService,
    oscService: OscService,
    rateLimiter: RateLimiter,
    updateBatcher: UpdateBatcher,
    config: BridgeEngineConfig
  ) {
    super();
    this.connectionManager = connectionManager;
    this.emberService = emberService;
    this.oscService = oscService;
    this.rateLimiter = rateLimiter;
    this.updateBatcher = updateBatcher;
    this.config = config;

    this.setupListeners();
  }

  private setupListeners(): void {
    this.emberService.on('valueChange', this.handleEmberUpdate.bind(this));
    this.oscService.on('message', this.handleOscMessage.bind(this));
    this.connectionManager.on('deleting', this.handleConnectionDelete.bind(this));
  }

  private handleEmberUpdate(path: string, value: unknown): void {
    const conn = this.connectionManager.getByEmberPath(path);
    if (!conn || !conn.isActive) return;

    if (!this.rateLimiter.canProcess(conn.id, 'ember')) {
      return;
    }

    // Check RateLimiter direction, not ConnectionManager (which doesn't auto-reset)
    const direction = this.rateLimiter.getDirection(conn.id);
    if (direction === 'osc-to-ember') {
      return;
    }

    this.connectionManager.updateRuntimeState(conn.id, {
      currentEmberValue: value,
      direction: 'ember-to-osc',
      lastActivity: Date.now(),
    });

    const oscValue = this.mapEmberToOsc(value, conn);

    this.oscService.send(conn.oscAddress, oscValue, conn.parameterType);

    this.updateBatcher.queue(conn.id, {
      currentEmberValue: value,
      direction: 'ember-to-osc',
    });

    this.rateLimiter.setDirection(conn.id, 'ember-to-osc');
    this.rateLimiter.scheduleReset(conn.id, this.config.directionResetDelay);

    logger.debug(`Ember→OSC: ${path} = ${value} → ${conn.oscAddress} = ${oscValue}`);
  }

  private handleOscMessage(address: string, args: OscArg[]): void {
    const connections = this.connectionManager.getByOscAddress(address);
    if (connections.length === 0) return;

    const value = parseOscValue(args);

    for (const conn of connections) {
      if (!conn.isActive) continue;

      if (!this.rateLimiter.canProcess(conn.id, 'osc')) continue;

      // Check RateLimiter direction, not ConnectionManager (which doesn't auto-reset)
      const direction = this.rateLimiter.getDirection(conn.id);
      if (direction === 'ember-to-osc') continue;

      this.connectionManager.updateRuntimeState(conn.id, {
        currentOscValue: value,
        direction: 'osc-to-ember',
        lastActivity: Date.now(),
      });

      const emberValue = this.mapOscToEmber(value, conn);

      this.emberService.setValue(conn.emberPath, emberValue).catch((error) => {
        logger.error(`Failed to set Ember+ value: ${error.message}`);
        this.connectionManager.updateRuntimeState(conn.id, {
          error: error.message,
        });
      });

      this.updateBatcher.queue(conn.id, {
        currentOscValue: value,
        direction: 'osc-to-ember',
      });

      this.rateLimiter.setDirection(conn.id, 'osc-to-ember');
      this.rateLimiter.scheduleReset(conn.id, this.config.directionResetDelay);

      logger.debug(`OSC→Ember: ${address} = ${value} → ${conn.emberPath} = ${emberValue}`);
    }
  }

  private async handleConnectionDelete(conn: { id: string; emberPath: string; isSubscribed: boolean }): Promise<void> {
    if (conn.isSubscribed) {
      try {
        await this.emberService.unsubscribeByPath(conn.emberPath);
      } catch {
        // Ignore cleanup errors
      }
    }
    this.rateLimiter.clear(conn.id);
  }

  private mapEmberToOsc(value: unknown, conn: { parameterType: string; emberMin: number; emberMax: number; oscMin: number; oscMax: number; curve: 'lin' | 'log' }): unknown {
    if (conn.parameterType === 'BOOLEAN') {
      return Boolean(value);
    }
    if (conn.parameterType === 'STRING') {
      return String(value);
    }

    return emberToOsc(
      Number(value),
      conn.emberMin,
      conn.emberMax,
      conn.oscMin,
      conn.oscMax,
      conn.curve
    );
  }

  private mapOscToEmber(value: unknown, conn: { parameterType: string; emberMin: number; emberMax: number; oscMin: number; oscMax: number; curve: 'lin' | 'log' }): unknown {
    if (conn.parameterType === 'BOOLEAN') {
      return Boolean(value);
    }
    if (conn.parameterType === 'STRING') {
      return String(value);
    }

    const mapped = oscToEmber(
      Number(value),
      conn.oscMin,
      conn.oscMax,
      conn.emberMin,
      conn.emberMax,
      conn.curve
    );

    if (conn.parameterType === 'INTEGER' || conn.parameterType === 'ENUM') {
      return Math.round(mapped);
    }

    return mapped;
  }

  async activateConnection(id: string, skipExpand = false): Promise<void> {
    const conn = this.connectionManager.get(id);
    if (!conn) {
      throw new Error(`Connection ${id} not found`);
    }

    try {
      await this.emberService.subscribe(conn.emberPath, (value) => {
        this.handleEmberUpdate(conn.emberPath, value);
      }, skipExpand);

      this.connectionManager.updateRuntimeState(id, {
        isSubscribed: true,
        isActive: true,
        error: undefined,
      });

      logger.info(`Activated connection: ${conn.emberPath} ↔ ${conn.oscAddress}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.connectionManager.updateRuntimeState(id, {
        isActive: false,
        error: message,
      });
      throw error;
    }
  }

  async deactivateConnection(id: string): Promise<void> {
    const conn = this.connectionManager.get(id);
    if (!conn) return;

    if (conn.isSubscribed) {
      try {
        await this.emberService.unsubscribeByPath(conn.emberPath);
      } catch {
        // Ignore cleanup errors
      }
    }

    this.connectionManager.updateRuntimeState(id, {
      isSubscribed: false,
      isActive: false,
    });

    this.rateLimiter.clear(id);
    logger.info(`Deactivated connection: ${conn.emberPath}`);
  }

  async activateAllConnections(): Promise<{ success: number; failed: number }> {
    const connections = this.connectionManager.getAll();
    let success = 0;
    let failed = 0;

    // Group connections by path prefix for efficient tree expansion
    const pathPrefixes = new Set<string>();
    for (const conn of connections) {
      const parts = conn.emberPath.split('.');
      let prefix = '';
      for (const part of parts.slice(0, -1)) {
        prefix = prefix ? `${prefix}.${part}` : part;
        pathPrefixes.add(prefix);
      }
    }

    // Pre-expand common path prefixes (sequential to avoid overwhelming the device)
    logger.info(`Pre-expanding ${pathPrefixes.size} path prefixes...`);
    for (const prefix of Array.from(pathPrefixes).sort()) {
      try {
        await this.emberService.expandPath(prefix);
      } catch {
        // Ignore expansion errors
      }
    }

    // Activate connections in parallel batches
    const BATCH_SIZE = 10;
    logger.info(`Activating ${connections.length} connections in batches of ${BATCH_SIZE}...`);
    
    for (let i = 0; i < connections.length; i += BATCH_SIZE) {
      const batch = connections.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(conn => this.activateConnection(conn.id, true)) // skipExpand=true since paths are pre-expanded
      );
      
      for (let j = 0; j < results.length; j++) {
        if (results[j].status === 'fulfilled') {
          success++;
        } else {
          failed++;
          logger.error(`Failed to activate ${batch[j].emberPath}: ${(results[j] as PromiseRejectedResult).reason}`);
        }
      }
    }

    logger.info(`Activated ${success} connections, ${failed} failed`);
    return { success, failed };
  }

  async deactivateAllConnections(): Promise<void> {
    const connections = this.connectionManager.getAll();
    
    for (const conn of connections) {
      await this.deactivateConnection(conn.id);
    }

    logger.info('Deactivated all connections');
  }
}
