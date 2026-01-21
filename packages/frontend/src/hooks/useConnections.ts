import { useEffect, useCallback } from 'react';
import { useConnectionStore } from '../stores/connectionStore';
import { api } from '../services/api';
import type { ConnectionConfig } from '../types';

export function useConnections() {
  const connections = useConnectionStore((s) => s.getAllConnections());
  const setConnections = useConnectionStore((s) => s.setConnections);
  const setLoading = useConnectionStore((s) => s.setLoading);
  const setError = useConnectionStore((s) => s.setError);
  const isLoading = useConnectionStore((s) => s.isLoading);
  const error = useConnectionStore((s) => s.error);

  const loadConnections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getConnections();
      setConnections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connections');
    }
  }, [setConnections, setLoading, setError]);

  const createConnection = useCallback(async (config: ConnectionConfig) => {
    try {
      await api.createConnection(config);
      await loadConnections();
    } catch (err) {
      throw err;
    }
  }, [loadConnections]);

  const deleteConnection = useCallback(async (id: string) => {
    try {
      await api.deleteConnection(id);
      await loadConnections();
    } catch (err) {
      throw err;
    }
  }, [loadConnections]);

  const activateConnection = useCallback(async (id: string) => {
    await api.activateConnection(id);
    await loadConnections();
  }, [loadConnections]);

  const deactivateConnection = useCallback(async (id: string) => {
    await api.deactivateConnection(id);
    await loadConnections();
  }, [loadConnections]);

  const activateAll = useCallback(async () => {
    await api.activateAllConnections();
    await loadConnections();
  }, [loadConnections]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  return {
    connections,
    isLoading,
    error,
    loadConnections,
    createConnection,
    deleteConnection,
    activateConnection,
    deactivateConnection,
    activateAll,
  };
}
