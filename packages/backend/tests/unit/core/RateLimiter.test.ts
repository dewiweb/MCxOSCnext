import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RateLimiter } from '../../../src/core/RateLimiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = new RateLimiter({ minInterval: 50 });
  });

  afterEach(() => {
    vi.useRealTimers();
    limiter.clearAll();
  });

  describe('canProcess()', () => {
    it('should allow first request', () => {
      expect(limiter.canProcess('conn1', 'ember')).toBe(true);
    });

    it('should block requests within interval', () => {
      limiter.canProcess('conn1', 'ember');
      expect(limiter.canProcess('conn1', 'ember')).toBe(false);
    });

    it('should allow requests after interval', () => {
      limiter.canProcess('conn1', 'ember');
      vi.advanceTimersByTime(60);
      expect(limiter.canProcess('conn1', 'ember')).toBe(true);
    });

    it('should track ember and osc separately', () => {
      limiter.canProcess('conn1', 'ember');
      expect(limiter.canProcess('conn1', 'osc')).toBe(true);
    });

    it('should track different connections separately', () => {
      limiter.canProcess('conn1', 'ember');
      expect(limiter.canProcess('conn2', 'ember')).toBe(true);
    });
  });

  describe('getDirection()', () => {
    it('should return idle by default', () => {
      expect(limiter.getDirection('conn1')).toBe('idle');
    });

    it('should return set direction', () => {
      limiter.canProcess('conn1', 'ember');
      limiter.setDirection('conn1', 'ember-to-osc');
      expect(limiter.getDirection('conn1')).toBe('ember-to-osc');
    });
  });

  describe('scheduleReset()', () => {
    it('should reset direction after delay', () => {
      limiter.canProcess('conn1', 'ember');
      limiter.setDirection('conn1', 'ember-to-osc');
      limiter.scheduleReset('conn1', 100);

      expect(limiter.getDirection('conn1')).toBe('ember-to-osc');
      
      vi.advanceTimersByTime(150);
      
      expect(limiter.getDirection('conn1')).toBe('idle');
    });

    it('should cancel previous reset on new schedule', () => {
      limiter.canProcess('conn1', 'ember');
      limiter.setDirection('conn1', 'ember-to-osc');
      limiter.scheduleReset('conn1', 100);
      
      vi.advanceTimersByTime(50);
      limiter.scheduleReset('conn1', 100);
      
      vi.advanceTimersByTime(80);
      expect(limiter.getDirection('conn1')).toBe('ember-to-osc');
      
      vi.advanceTimersByTime(50);
      expect(limiter.getDirection('conn1')).toBe('idle');
    });
  });

  describe('clear()', () => {
    it('should clear timing for connection', () => {
      limiter.canProcess('conn1', 'ember');
      limiter.setDirection('conn1', 'ember-to-osc');
      
      limiter.clear('conn1');
      
      expect(limiter.getDirection('conn1')).toBe('idle');
    });
  });

  describe('clearAll()', () => {
    it('should clear all connections', () => {
      limiter.canProcess('conn1', 'ember');
      limiter.canProcess('conn2', 'osc');
      
      limiter.clearAll();
      
      expect(limiter.getDirection('conn1')).toBe('idle');
      expect(limiter.getDirection('conn2')).toBe('idle');
    });
  });
});
