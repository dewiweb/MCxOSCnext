import { useEffect, useRef } from 'react';
import { useConnectionStore } from '../stores/connectionStore';
import { useStatusStore } from '../stores/statusStore';
import { useLogStore } from '../stores/logStore';
import type { WsMessage, ConnectionRuntimeState, ServiceStatus, Connection } from '../types';
import type { LogEntry } from '../components/LogViewer';

const WS_URL = `ws://${window.location.host}/ws`;
const RECONNECT_DELAY = 2000;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const applyBatchUpdate = useConnectionStore((s) => s.applyBatchUpdate);
  const addConnection = useConnectionStore((s) => s.addConnection);
  const removeConnection = useConnectionStore((s) => s.removeConnection);
  const setStatus = useStatusStore((s) => s.setStatus);
  const setConnected = useStatusStore((s) => s.setConnected);
  const addLogs = useLogStore((s) => s.addLogs);
  const addLog = useLogStore((s) => s.addLog);

  const handleMessage = (message: WsMessage) => {
    switch (message.type) {
      case 'connections:init':
      case 'connections:update': {
        const data = message.data as Record<string, ConnectionRuntimeState>;
        applyBatchUpdate(data);
        break;
      }
      case 'connection:created': {
        const conn = message.data as Connection;
        addConnection(conn);
        addLog({ timestamp: Date.now(), level: 'info', message: `Connection created: ${conn.emberPath}`, source: 'Bridge' });
        break;
      }
      case 'connection:deleted': {
        const { id } = message.data as { id: string };
        removeConnection(id);
        addLog({ timestamp: Date.now(), level: 'info', message: `Connection deleted: ${id}`, source: 'Bridge' });
        break;
      }
      case 'status:update': {
        const status = message.data as ServiceStatus;
        setStatus(status);
        break;
      }
      case 'logs:batch': {
        const logs = message.data as LogEntry[];
        addLogs(logs);
        break;
      }
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectTimeoutRef.current = window.setTimeout(() => {
      connect();
    }, RECONNECT_DELAY);
  };

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      addLog({ timestamp: Date.now(), level: 'info', message: 'WebSocket connected', source: 'WS' });
      ws.send(JSON.stringify({ type: 'subscribe', topics: ['connections', 'status', 'logs'] }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch {
        // Parse error
      }
    };

    ws.onclose = () => {
      setConnected(false);
      addLog({ timestamp: Date.now(), level: 'warn', message: 'WebSocket disconnected', source: 'WS' });
      scheduleReconnect();
    };

    ws.onerror = () => {
      addLog({ timestamp: Date.now(), level: 'error', message: 'WebSocket error', source: 'WS' });
    };
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);

  return { connect, disconnect };
}
