import { create } from 'zustand';
import type { Connection, ConnectionRuntimeState } from '../types';

interface ConnectionStore {
  connections: Map<string, Connection>;
  isLoading: boolean;
  error: string | null;

  setConnections: (connections: Connection[]) => void;
  addConnection: (connection: Connection) => void;
  updateConnection: (id: string, changes: Partial<Connection>) => void;
  removeConnection: (id: string) => void;
  applyBatchUpdate: (updates: Record<string, ConnectionRuntimeState>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getConnection: (id: string) => Connection | undefined;
  getAllConnections: () => Connection[];
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  connections: new Map(),
  isLoading: false,
  error: null,

  setConnections: (connections) => {
    set({
      connections: new Map(connections.map((c) => [c.id, c])),
      isLoading: false,
    });
  },

  addConnection: (connection) => {
    set((state) => {
      const newMap = new Map(state.connections);
      newMap.set(connection.id, connection);
      return { connections: newMap };
    });
  },

  updateConnection: (id, changes) => {
    set((state) => {
      const conn = state.connections.get(id);
      if (!conn) return state;
      const newMap = new Map(state.connections);
      newMap.set(id, { ...conn, ...changes });
      return { connections: newMap };
    });
  },

  removeConnection: (id) => {
    set((state) => {
      const newMap = new Map(state.connections);
      newMap.delete(id);
      return { connections: newMap };
    });
  },

  applyBatchUpdate: (updates) => {
    set((state) => {
      const newMap = new Map(state.connections);
      for (const [id, changes] of Object.entries(updates)) {
        const conn = newMap.get(id);
        if (conn) {
          newMap.set(id, {
            ...conn,
            currentEmberValue: changes.currentEmberValue ?? conn.currentEmberValue,
            currentOscValue: changes.currentOscValue ?? conn.currentOscValue,
            direction: changes.direction ?? conn.direction,
            isActive: changes.isActive ?? conn.isActive,
            error: changes.error ?? conn.error,
          });
        }
      }
      return { connections: newMap };
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  
  getConnection: (id) => get().connections.get(id),
  getAllConnections: () => Array.from(get().connections.values()),
}));
