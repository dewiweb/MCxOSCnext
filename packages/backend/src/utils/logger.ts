/**
 * Simple logger utility for MCxOSC Backend.
 * Uses pino in production, console in development.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

function formatMessage(name: string, level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] [${name}] ${message}`;
}

export function createLogger(name: string): Logger {
  return {
    debug: (message: string, ...args: unknown[]) => {
      if (process.env.NODE_ENV !== 'production') {
        console.debug(formatMessage(name, 'debug', message), ...args);
      }
    },
    info: (message: string, ...args: unknown[]) => {
      console.info(formatMessage(name, 'info', message), ...args);
    },
    warn: (message: string, ...args: unknown[]) => {
      console.warn(formatMessage(name, 'warn', message), ...args);
    },
    error: (message: string, ...args: unknown[]) => {
      console.error(formatMessage(name, 'error', message), ...args);
    },
  };
}
