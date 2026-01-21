import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConnectionManager } from '../../../src/core/ConnectionManager';

describe('ConnectionManager', () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    manager = new ConnectionManager({ persistPath: ':memory:' });
  });

  describe('create()', () => {
    it('should create connection with UUID', () => {
      const conn = manager.create({
        emberPath: '1.2.3.4',
        oscAddress: '/test',
      });

      expect(conn.id).toMatch(/^[a-f0-9-]{36}$/);
      expect(conn.emberPath).toBe('1.2.3.4');
      expect(conn.oscAddress).toBe('/test');
    });

    it('should set default values', () => {
      const conn = manager.create({
        emberPath: '1.2.3',
        oscAddress: '/test',
      });

      expect(conn.parameterType).toBe('INTEGER');
      expect(conn.curve).toBe('lin');
      expect(conn.emberMin).toBe(0);
      expect(conn.emberMax).toBe(100);
      expect(conn.oscMin).toBe(0);
      expect(conn.oscMax).toBe(1);
      expect(conn.factor).toBe(1);
      expect(conn.isActive).toBe(false);
      expect(conn.isSubscribed).toBe(false);
      expect(conn.direction).toBe('idle');
    });

    it('should emit created event', () => {
      const handler = vi.fn();
      manager.on('created', handler);

      manager.create({ emberPath: '1.2.3', oscAddress: '/test' });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should use provided config values', () => {
      const conn = manager.create({
        emberPath: '1.2.3',
        oscAddress: '/test',
        parameterType: 'REAL',
        curve: 'log',
        emberMin: -100,
        emberMax: 100,
        oscMin: 0,
        oscMax: 127,
      });

      expect(conn.parameterType).toBe('REAL');
      expect(conn.curve).toBe('log');
      expect(conn.emberMin).toBe(-100);
      expect(conn.emberMax).toBe(100);
      expect(conn.oscMin).toBe(0);
      expect(conn.oscMax).toBe(127);
    });
  });

  describe('get()', () => {
    it('should return connection by id', () => {
      const created = manager.create({
        emberPath: '1.2.3',
        oscAddress: '/test',
      });

      const found = manager.get(created.id);

      expect(found?.id).toBe(created.id);
    });

    it('should return undefined for unknown id', () => {
      expect(manager.get('unknown-id')).toBeUndefined();
    });
  });

  describe('getAll()', () => {
    it('should return all connections', () => {
      manager.create({ emberPath: '1.2.3', oscAddress: '/test1' });
      manager.create({ emberPath: '1.2.4', oscAddress: '/test2' });

      const all = manager.getAll();

      expect(all).toHaveLength(2);
    });
  });

  describe('getByEmberPath()', () => {
    it('should find connection by path', () => {
      const created = manager.create({
        emberPath: '1.2.3.4',
        oscAddress: '/test',
      });

      const found = manager.getByEmberPath('1.2.3.4');

      expect(found?.id).toBe(created.id);
    });

    it('should return undefined for unknown path', () => {
      expect(manager.getByEmberPath('9.9.9')).toBeUndefined();
    });
  });

  describe('getByOscAddress()', () => {
    it('should find connections by address', () => {
      const created = manager.create({
        emberPath: '1.2.3',
        oscAddress: '/fader/1',
      });

      const found = manager.getByOscAddress('/fader/1');

      expect(found).toHaveLength(1);
      expect(found[0].id).toBe(created.id);
    });

    it('should return multiple connections with same address', () => {
      manager.create({ emberPath: '1.2.3', oscAddress: '/fader/1' });
      manager.create({ emberPath: '1.2.4', oscAddress: '/fader/1' });

      const found = manager.getByOscAddress('/fader/1');

      expect(found).toHaveLength(2);
    });

    it('should return empty array for unknown address', () => {
      expect(manager.getByOscAddress('/unknown')).toHaveLength(0);
    });
  });

  describe('update()', () => {
    it('should update connection', () => {
      const conn = manager.create({
        emberPath: '1.2.3',
        oscAddress: '/test',
      });

      const updated = manager.update(conn.id, {
        oscAddress: '/updated',
        curve: 'log',
      });

      expect(updated.oscAddress).toBe('/updated');
      expect(updated.curve).toBe('log');
    });

    it('should emit updated event', () => {
      const conn = manager.create({
        emberPath: '1.2.3',
        oscAddress: '/test',
      });

      const handler = vi.fn();
      manager.on('updated', handler);

      manager.update(conn.id, { curve: 'log' });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should throw for unknown id', () => {
      expect(() => manager.update('unknown', {})).toThrow('not found');
    });
  });

  describe('delete()', () => {
    it('should delete connection', () => {
      const conn = manager.create({
        emberPath: '1.2.3',
        oscAddress: '/test',
      });

      manager.delete(conn.id);

      expect(manager.get(conn.id)).toBeUndefined();
    });

    it('should emit deleting and deleted events', () => {
      const conn = manager.create({
        emberPath: '1.2.3',
        oscAddress: '/test',
      });

      const deletingHandler = vi.fn();
      const deletedHandler = vi.fn();
      manager.on('deleting', deletingHandler);
      manager.on('deleted', deletedHandler);

      manager.delete(conn.id);

      expect(deletingHandler).toHaveBeenCalledTimes(1);
      expect(deletedHandler).toHaveBeenCalledTimes(1);
    });

    it('should remove from indexes', () => {
      const conn = manager.create({
        emberPath: '1.2.3',
        oscAddress: '/test',
      });

      manager.delete(conn.id);

      expect(manager.getByEmberPath('1.2.3')).toBeUndefined();
      expect(manager.getByOscAddress('/test')).toHaveLength(0);
    });
  });

  describe('updateRuntimeState()', () => {
    it('should update runtime state', () => {
      const conn = manager.create({
        emberPath: '1.2.3',
        oscAddress: '/test',
      });

      manager.updateRuntimeState(conn.id, {
        currentEmberValue: 50,
        direction: 'ember-to-osc',
        isActive: true,
      });

      const updated = manager.get(conn.id);
      expect(updated?.currentEmberValue).toBe(50);
      expect(updated?.direction).toBe('ember-to-osc');
      expect(updated?.isActive).toBe(true);
    });

    it('should emit stateChanged event', () => {
      const conn = manager.create({
        emberPath: '1.2.3',
        oscAddress: '/test',
      });

      const handler = vi.fn();
      manager.on('stateChanged', handler);

      manager.updateRuntimeState(conn.id, { isActive: true });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('importSession()', () => {
    it('should import modern session format', () => {
      manager.importSession({
        version: '2.0',
        connections: [
          { emberPath: '1.2.3', oscAddress: '/test1' },
          { emberPath: '1.2.4', oscAddress: '/test2' },
        ],
      });

      expect(manager.getAll()).toHaveLength(2);
    });

    it('should import legacy session format', () => {
      manager.importSession([
        { path: '1.2.3', address: '/test', type: 'Integer', math: 'lin', min: '0/0', max: '100/1', factor: '1' },
      ]);

      const all = manager.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].emberPath).toBe('1.2.3');
      expect(all[0].oscAddress).toBe('/test');
    });
  });

  describe('exportSession()', () => {
    it('should export session', () => {
      manager.create({ emberPath: '1.2.3', oscAddress: '/test' });

      const session = manager.exportSession();

      expect(session.version).toBe('2.0');
      expect(session.connections).toHaveLength(1);
      expect(session.connections[0].emberPath).toBe('1.2.3');
    });
  });
});
