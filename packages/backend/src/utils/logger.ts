/**
 * Simple logger utility for MCxOSC Backend.
 */

import { EventEmitter } from 'events';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  source: string;
  message: string;
}

interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

// Global log event bus — WebSocketManager subscribes to forward logs to clients
export const logBus = new EventEmitter();
logBus.setMaxListeners(20);

function formatArgs(args: unknown[]): string {
  if (args.length === 0) return '';
  return ' ' + args.map((a) => {
    if (a instanceof Error) return a.message;
    if (typeof a === 'object') return JSON.stringify(a);
    return String(a);
  }).join(' ');
}

export function createLogger(name: string): Logger {
  const emit = (level: LogLevel, message: string, args: unknown[]) => {
    const entry: LogEntry = { timestamp: Date.now(), level, source: name, message: message + formatArgs(args) };
    logBus.emit('log', entry);
  };

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV !== 'production') {
        const ts = new Date().toISOString();
        console.debug(`[${ts}] [DEBUG] [${name}] ${message}`, ...args);
        emit('debug', message, args);
      }
    },
    info: (message: string, ...args: unknown[]) => {
      const ts = new Date().toISOString();
      console.info(`[${ts}] [INFO]  [${name}] ${message}`, ...args);
      emit('info', message, args);
    },
    warn: (message: string, ...args: unknown[]) => {
      const ts = new Date().toISOString();
      console.warn(`[${ts}] [WARN]  [${name}] ${message}`, ...args);
      emit('warn', message, args);
    },
    error: (message: string, ...args: unknown[]) => {
      const ts = new Date().toISOString();
      console.error(`[${ts}] [ERROR] [${name}] ${message}`, ...args);
      emit('error', message, args);
    },
  };
}
