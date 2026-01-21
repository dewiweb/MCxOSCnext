import type { Direction } from '../types/index.js';

interface ConnectionTiming {
  ember: number;
  osc: number;
  direction: Direction;
}

/**
 * RateLimiter - Prevents feedback loops and manages direction state.
 * Ensures that rapid bidirectional updates don't create echo effects.
 */
export class RateLimiter {
  private timing: Map<string, ConnectionTiming> = new Map();
  private pendingResets: Map<string, NodeJS.Timeout> = new Map();
  private minInterval: number;

  constructor(options: { minInterval?: number } = {}) {
    this.minInterval = options.minInterval ?? 50;
  }

  canProcess(connectionId: string, source: 'ember' | 'osc'): boolean {
    const now = Date.now();
    const timing = this.timing.get(connectionId);

    if (!timing) {
      this.timing.set(connectionId, {
        ember: source === 'ember' ? now : 0,
        osc: source === 'osc' ? now : 0,
        direction: 'idle',
      });
      return true;
    }

    const lastTime = source === 'ember' ? timing.ember : timing.osc;
    if (now - lastTime < this.minInterval) {
      return false;
    }

    if (source === 'ember') {
      timing.ember = now;
    } else {
      timing.osc = now;
    }

    return true;
  }

  getDirection(connectionId: string): Direction {
    return this.timing.get(connectionId)?.direction ?? 'idle';
  }

  setDirection(connectionId: string, direction: Direction): void {
    const timing = this.timing.get(connectionId);
    if (timing) {
      timing.direction = direction;
    }
  }

  scheduleReset(connectionId: string, delayMs: number): void {
    const existing = this.pendingResets.get(connectionId);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      const timing = this.timing.get(connectionId);
      if (timing) {
        timing.direction = 'idle';
      }
      this.pendingResets.delete(connectionId);
    }, delayMs);

    this.pendingResets.set(connectionId, timer);
  }

  clear(connectionId: string): void {
    this.timing.delete(connectionId);
    const timer = this.pendingResets.get(connectionId);
    if (timer) {
      clearTimeout(timer);
      this.pendingResets.delete(connectionId);
    }
  }

  clearAll(): void {
    this.timing.clear();
    for (const timer of this.pendingResets.values()) {
      clearTimeout(timer);
    }
    this.pendingResets.clear();
  }
}
