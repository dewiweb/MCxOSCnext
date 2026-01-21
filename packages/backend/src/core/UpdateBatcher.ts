import { EventEmitter } from 'events';
import type { ConnectionRuntimeState } from '../types/index.js';

interface PendingUpdate {
  [connectionId: string]: Partial<ConnectionRuntimeState>;
}

/**
 * UpdateBatcher - Batches connection state updates for WebSocket delivery.
 * Reduces traffic by sending grouped updates at configurable intervals.
 */
export class UpdateBatcher extends EventEmitter {
  private pendingUpdates: PendingUpdate = {};
  private timer: NodeJS.Timeout | null = null;
  private activeInterval: number;
  private idleInterval: number;
  private lastActivity: number = 0;
  private readonly IDLE_THRESHOLD = 2000;

  constructor(options: { activeInterval?: number; idleInterval?: number } = {}) {
    super();
    this.activeInterval = options.activeInterval ?? 100;
    this.idleInterval = options.idleInterval ?? 1000;
  }

  queue(connectionId: string, changes: Partial<ConnectionRuntimeState>): void {
    if (!this.pendingUpdates[connectionId]) {
      this.pendingUpdates[connectionId] = {};
    }

    Object.assign(this.pendingUpdates[connectionId], changes);
    this.lastActivity = Date.now();
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.timer) return;

    const interval = this.isIdle() ? this.idleInterval : this.activeInterval;
    this.timer = setTimeout(() => this.flush(), interval);
  }

  private flush(): void {
    this.timer = null;

    if (Object.keys(this.pendingUpdates).length === 0) return;

    const updates = this.pendingUpdates;
    this.pendingUpdates = {};

    this.emit('batch', {
      type: 'connections:update',
      data: updates,
      timestamp: Date.now(),
    });

    if (Object.keys(this.pendingUpdates).length > 0) {
      this.scheduleFlush();
    }
  }

  private isIdle(): boolean {
    return Date.now() - this.lastActivity > this.IDLE_THRESHOLD;
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
