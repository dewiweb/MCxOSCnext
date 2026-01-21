import * as fs from 'fs/promises';
import * as path from 'path';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ConfigManager');

export interface AppConfiguration {
  network: {
    ember: {
      host: string;
      port: number;
    };
    osc: {
      rxPort: number;
      txHost: string;
      txPort: number;
    };
  };
  startup: {
    autoConnect: boolean;
    autoActivate: boolean;
    defaultSession: string | null;
  };
  storage: {
    sessionsDir: string;
  };
}

const DEFAULT_CONFIG: AppConfiguration = {
  network: {
    ember: {
      host: '127.0.0.1',
      port: 9000,
    },
    osc: {
      rxPort: 8000,
      txHost: '127.0.0.1',
      txPort: 9000,
    },
  },
  startup: {
    autoConnect: true,
    autoActivate: true,
    defaultSession: null,
  },
  storage: {
    sessionsDir: './sessions',
  },
};

export class ConfigManager {
  private config: AppConfiguration;
  private configPath: string;
  private saveTimer: NodeJS.Timeout | null = null;
  private readonly SAVE_DELAY = 1000;

  constructor(configPath: string) {
    this.configPath = configPath;
    this.config = { ...DEFAULT_CONFIG };
  }

  async load(): Promise<void> {
    try {
      const dir = path.dirname(this.configPath);
      await fs.mkdir(dir, { recursive: true });

      const content = await fs.readFile(this.configPath, 'utf-8');
      const loaded = JSON.parse(content);
      
      // Merge with defaults to ensure all fields exist
      this.config = this.mergeConfig(DEFAULT_CONFIG, loaded);
      logger.info(`Loaded configuration from ${this.configPath}`);
    } catch {
      // File doesn't exist or is invalid - use defaults
      logger.info('No config file found, using defaults');
      await this.save();
    }

    // Override with environment variables if present
    this.applyEnvOverrides();
  }

  private applyEnvOverrides(): void {
    if (process.env.EMBER_HOST) {
      this.config.network.ember.host = process.env.EMBER_HOST;
      logger.info(`Ember host overridden by env: ${process.env.EMBER_HOST}`);
    }
    if (process.env.EMBER_PORT) {
      this.config.network.ember.port = parseInt(process.env.EMBER_PORT, 10);
      logger.info(`Ember port overridden by env: ${process.env.EMBER_PORT}`);
    }
    if (process.env.OSC_RX_PORT) {
      this.config.network.osc.rxPort = parseInt(process.env.OSC_RX_PORT, 10);
    }
    if (process.env.OSC_TX_HOST) {
      this.config.network.osc.txHost = process.env.OSC_TX_HOST;
    }
    if (process.env.OSC_TX_PORT) {
      this.config.network.osc.txPort = parseInt(process.env.OSC_TX_PORT, 10);
    }
  }

  async save(): Promise<void> {
    try {
      const dir = path.dirname(this.configPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
      logger.debug(`Configuration saved to ${this.configPath}`);
    } catch (error) {
      logger.error('Failed to save configuration:', error);
    }
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), this.SAVE_DELAY);
  }

  get(): AppConfiguration {
    return { ...this.config };
  }

  getNetwork() {
    return { ...this.config.network };
  }

  getStartup() {
    return { ...this.config.startup };
  }

  update(changes: Partial<AppConfiguration>): AppConfiguration {
    if (changes.network) {
      if (changes.network.ember) {
        this.config.network.ember = { ...this.config.network.ember, ...changes.network.ember };
      }
      if (changes.network.osc) {
        this.config.network.osc = { ...this.config.network.osc, ...changes.network.osc };
      }
    }
    if (changes.startup) {
      this.config.startup = { ...this.config.startup, ...changes.startup };
    }
    if (changes.storage) {
      this.config.storage = { ...this.config.storage, ...changes.storage };
    }
    
    this.scheduleSave();
    return this.get();
  }

  updateEmber(host: string, port: number): void {
    this.config.network.ember = { host, port };
    this.scheduleSave();
  }

  updateOsc(rxPort: number, txHost: string, txPort: number): void {
    this.config.network.osc = { rxPort, txHost, txPort };
    this.scheduleSave();
  }

  setDefaultSession(sessionPath: string | null): void {
    this.config.startup.defaultSession = sessionPath;
    this.scheduleSave();
  }

  setAutoConnect(enabled: boolean): void {
    this.config.startup.autoConnect = enabled;
    this.scheduleSave();
  }

  setAutoActivate(enabled: boolean): void {
    this.config.startup.autoActivate = enabled;
    this.scheduleSave();
  }

  private mergeConfig(defaults: AppConfiguration, loaded: Partial<AppConfiguration>): AppConfiguration {
    return {
      network: {
        ember: { ...defaults.network.ember, ...loaded.network?.ember },
        osc: { ...defaults.network.osc, ...loaded.network?.osc },
      },
      startup: { ...defaults.startup, ...loaded.startup },
      storage: { ...defaults.storage, ...loaded.storage },
    };
  }
}
