import { Router, Request, Response } from 'express';
import type { ConfigManager, AppConfiguration } from '../../core/ConfigManager.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('api:config');

export interface ConfigRouterDeps {
  configManager: ConfigManager;
  onEmberReconnect: (host: string, port: number) => Promise<void>;
  onOscRestart: (rxPort: number, txHost: string, txPort: number) => Promise<void>;
}

export function createConfigRouter(deps: ConfigRouterDeps): Router {
  const { configManager } = deps;
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const config = configManager.get();
    res.json({
      success: true,
      data: {
        ember: config.network.ember,
        osc: config.network.osc,
        startup: config.startup,
      },
      timestamp: new Date().toISOString(),
    });
  });

  router.put('/', async (req: Request, res: Response) => {
    try {
      const changes = req.body;
      const oldConfig = configManager.get();

      // Update config
      if (changes.ember) {
        configManager.updateEmber(
          changes.ember.host ?? oldConfig.network.ember.host,
          changes.ember.port ?? oldConfig.network.ember.port
        );
      }
      if (changes.osc) {
        configManager.updateOsc(
          changes.osc.rxPort ?? oldConfig.network.osc.rxPort,
          changes.osc.txHost ?? oldConfig.network.osc.txHost,
          changes.osc.txPort ?? oldConfig.network.osc.txPort
        );
      }
      if (changes.startup) {
        if (changes.startup.autoConnect !== undefined) {
          configManager.setAutoConnect(changes.startup.autoConnect);
        }
        if (changes.startup.autoActivate !== undefined) {
          configManager.setAutoActivate(changes.startup.autoActivate);
        }
        if (changes.startup.defaultSession !== undefined) {
          configManager.setDefaultSession(changes.startup.defaultSession);
        }
      }

      const newConfig = configManager.get();

      // Reconnect Ember+ if host/port changed
      if (changes.ember) {
        logger.info(`Reconnecting Ember+ to ${newConfig.network.ember.host}:${newConfig.network.ember.port}`);
        await deps.onEmberReconnect(newConfig.network.ember.host, newConfig.network.ember.port);
      }

      // Restart OSC if ports changed
      if (changes.osc) {
        logger.info(`Restarting OSC: RX=${newConfig.network.osc.rxPort}, TX=${newConfig.network.osc.txHost}:${newConfig.network.osc.txPort}`);
        await deps.onOscRestart(newConfig.network.osc.rxPort, newConfig.network.osc.txHost, newConfig.network.osc.txPort);
      }

      res.json({
        success: true,
        data: {
          ember: newConfig.network.ember,
          osc: newConfig.network.osc,
          startup: newConfig.startup,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to update config:', error);
      res.status(500).json({
        success: false,
        error: { code: 'CONFIG_ERROR', message },
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.post('/ember/connect', async (req: Request, res: Response) => {
    try {
      const { host, port } = req.body;
      const config = configManager.get();
      
      const emberHost = host ?? config.network.ember.host;
      const emberPort = port ?? config.network.ember.port;
      
      configManager.updateEmber(emberHost, emberPort);
      await deps.onEmberReconnect(emberHost, emberPort);

      res.json({
        success: true,
        data: { message: 'Ember+ connection initiated' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        success: false,
        error: { code: 'CONNECT_ERROR', message },
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.post('/osc/restart', async (req: Request, res: Response) => {
    try {
      const { rxPort, txHost, txPort } = req.body;
      const config = configManager.get();
      
      const oscRxPort = rxPort ?? config.network.osc.rxPort;
      const oscTxHost = txHost ?? config.network.osc.txHost;
      const oscTxPort = txPort ?? config.network.osc.txPort;
      
      configManager.updateOsc(oscRxPort, oscTxHost, oscTxPort);
      await deps.onOscRestart(oscRxPort, oscTxHost, oscTxPort);

      res.json({
        success: true,
        data: { message: 'OSC service restarted' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        success: false,
        error: { code: 'RESTART_ERROR', message },
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}
