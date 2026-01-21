import { create } from 'zustand';
import type { LogEntry } from '../components/LogViewer';

const MAX_LOGS = 500;

interface LogStore {
  logs: LogEntry[];
  addLog: (entry: LogEntry) => void;
  addLogs: (entries: LogEntry[]) => void;
  clear: () => void;
}

export const useLogStore = create<LogStore>((set) => ({
  logs: [],

  addLog: (entry) => set((state) => ({
    logs: [...state.logs.slice(-MAX_LOGS + 1), entry],
  })),

  addLogs: (entries) => set((state) => ({
    logs: [...state.logs, ...entries].slice(-MAX_LOGS),
  })),

  clear: () => set({ logs: [] }),
}));

export function logInfo(message: string, source?: string) {
  useLogStore.getState().addLog({
    timestamp: Date.now(),
    level: 'info',
    message,
    source,
  });
}

export function logError(message: string, source?: string) {
  useLogStore.getState().addLog({
    timestamp: Date.now(),
    level: 'error',
    message,
    source,
  });
}

export function logWarn(message: string, source?: string) {
  useLogStore.getState().addLog({
    timestamp: Date.now(),
    level: 'warn',
    message,
    source,
  });
}

export function logDebug(message: string, source?: string) {
  useLogStore.getState().addLog({
    timestamp: Date.now(),
    level: 'debug',
    message,
    source,
  });
}
