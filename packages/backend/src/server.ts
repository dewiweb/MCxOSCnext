import express, { Express } from 'express';
import cors from 'cors';
import { createServer, Server } from 'http';
import { ConnectionManager } from './core/ConnectionManager.js';
import { ConfigManager } from './core/ConfigManager.js';
import { RateLimiter } from './core/RateLimiter.js';
import { UpdateBatcher } from './core/UpdateBatcher.js';
import { EmberService } from './services/ember/EmberService.js';
import { OscService } from './services/osc/OscService.js';
import { BridgeEngine } from './services/bridge/BridgeEngine.js';
import { WebSocketManager } from './api/WebSocketServer.js';
import { createConnectionsRouter } from './api/routes/connections.js';
import { createStatusRouter } from './api/routes/status.js';
import { createSessionsRouter } from './api/routes/sessions.js';
import { createTreeRouter } from './api/routes/tree.js';
import { createConfigRouter } from './api/routes/config.js';
import { defaultConfig } from './config/defaults.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('server');

export interface AppContext {
  app: Express;
  server: Server;
  configManager: ConfigManager;
  connectionManager: ConnectionManager;
  emberService: EmberService;
  oscService: OscService;
  bridgeEngine: BridgeEngine;
  rateLimiter: RateLimiter;
  updateBatcher: UpdateBatcher;
  wsManager: WebSocketManager;
}

export async function createApp(): Promise<AppContext> {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Load configuration from file
  const configManager = new ConfigManager('./data/config.json');
  await configManager.load();
  const config = configManager.get();

  const connectionManager = new ConnectionManager({
    persistPath: defaultConfig.session.persistPath,
  });

  const rateLimiter = new RateLimiter({
    minInterval: defaultConfig.bridge.rateLimit,
  });

  const updateBatcher = new UpdateBatcher({
    activeInterval: 100,
    idleInterval: 1000,
  });

  const emberService = new EmberService({
    host: config.network.ember.host,
    port: config.network.ember.port,
    autoReconnect: config.startup.autoConnect,
    reconnectInterval: defaultConfig.ember.reconnectInterval,
  });

  const oscService = new OscService({
    rxPort: config.network.osc.rxPort,
    txHost: config.network.osc.txHost,
    txPort: config.network.osc.txPort,
  });

  const bridgeEngine = new BridgeEngine(
    connectionManager,
    emberService,
    oscService,
    rateLimiter,
    updateBatcher,
    { directionResetDelay: defaultConfig.bridge.directionResetDelay }
  );

  app.use('/api/v1/connections', createConnectionsRouter(connectionManager, bridgeEngine));
  app.use('/api/v1/status', createStatusRouter(emberService, oscService, connectionManager));
  app.use('/api/v1/sessions', createSessionsRouter(connectionManager, bridgeEngine));
  app.use('/api/v1/tree', createTreeRouter(emberService));
  app.use('/api/v1/config', createConfigRouter({
    configManager,
    onEmberReconnect: async (host: string, port: number) => {
      await emberService.disconnect();
      (emberService as any).config.host = host;
      (emberService as any).config.port = port;
      await emberService.connect();
      await bridgeEngine.activateAllConnections();
    },
    onOscRestart: async (rxPort: number, txHost: string, txPort: number) => {
      await oscService.stop();
      (oscService as any).config.rxPort = rxPort;
      (oscService as any).config.txHost = txHost;
      (oscService as any).config.txPort = txPort;
      await oscService.start();
    },
  }));

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const server = createServer(app);
  const wsManager = new WebSocketManager(updateBatcher, emberService, oscService, connectionManager);

  await connectionManager.load();
  logger.info(`Loaded ${connectionManager.getAll().length} connections from storage`);

  return {
    app,
    server,
    configManager,
    connectionManager,
    emberService,
    oscService,
    bridgeEngine,
    rateLimiter,
    updateBatcher,
    wsManager,
  };
}

export async function startServer(context: AppContext): Promise<void> {
  const { server, emberService, oscService, bridgeEngine, updateBatcher, connectionManager, rateLimiter, wsManager } = context;

  wsManager.attach(server);

  try {
    await oscService.start();
    logger.info('OSC service started');
  } catch (error) {
    logger.error('Failed to start OSC service:', error);
  }

  if (defaultConfig.ember.autoConnect) {
    try {
      await emberService.connect();
      logger.info('Ember+ service connected');

      if (defaultConfig.bridge.autoActivateOnLoad) {
        const result = await bridgeEngine.activateAllConnections();
        logger.info(`Auto-activated ${result.success} connections`);
      }
    } catch (error) {
      logger.error('Failed to connect to Ember+:', error);
    }
  }

  const port = defaultConfig.server.port;
  const host = defaultConfig.server.host;

  server.listen(port, host, () => {
    logger.info(`MCxOSC Backend running at http://${host}:${port}`);
    logger.info(`API available at http://${host}:${port}/api/v1`);
    logger.info(`WebSocket available at ws://${host}:${port}/ws`);
  });

  process.on('SIGTERM', async () => {
    logger.info('Shutting down...');
    wsManager.close();
    await bridgeEngine.deactivateAllConnections();
    await emberService.disconnect();
    await oscService.stop();
    await connectionManager.persist();
    rateLimiter.clearAll();
    updateBatcher.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('Shutting down...');
    wsManager.close();
    await bridgeEngine.deactivateAllConnections();
    await emberService.disconnect();
    await oscService.stop();
    await connectionManager.persist();
    rateLimiter.clearAll();
    updateBatcher.stop();
    process.exit(0);
  });
}
