import type { AppConfig } from '../types/index.js';

export const defaultConfig: AppConfig = {
  ember: {
    host: process.env.EMBER_HOST || '127.0.0.1',
    port: parseInt(process.env.EMBER_PORT || '9000', 10),
    autoConnect: process.env.AUTO_CONNECT !== 'false',
    reconnectInterval: 5000,
  },
  osc: {
    rxPort: parseInt(process.env.OSC_RX_PORT || '8000', 10),
    txHost: process.env.OSC_TX_HOST || '127.0.0.1',
    txPort: parseInt(process.env.OSC_TX_PORT || '9000', 10),
  },
  session: {
    autoLoad: process.env.AUTO_LOAD_SESSION,
    autoSaveInterval: 30000,
    persistPath: process.env.PERSIST_PATH || './data/state.json',
  },
  bridge: {
    rateLimit: 50,
    directionResetDelay: 500,
    autoActivateOnLoad: true,
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
  },
};
