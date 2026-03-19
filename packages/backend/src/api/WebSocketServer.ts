import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { Server } from 'http';
import type { UpdateBatcher } from '../core/UpdateBatcher.js';
import type { EmberService } from '../services/ember/EmberService.js';
import type { OscService } from '../services/osc/OscService.js';
import type { ConnectionManager } from '../core/ConnectionManager.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('WebSocket');

interface WsClient {
  ws: WebSocket;
  topics: Set<string>;
  lastPing: number;
}

interface WsMessage {
  type: string;
  topics?: string[];
  channelPath?: string;
  params?: string[];
}

interface ChannelSubscription {
  channelPath: string;
  params: Map<string, string>; // paramPath -> description
}

/**
 * WebSocketManager - Manages WebSocket connections for real-time updates.
 * Broadcasts batched connection updates to subscribed clients.
 */
export class WebSocketManager {
  private wss: WSServer | null = null;
  private clients: Map<WebSocket, WsClient> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private meteringInterval: NodeJS.Timeout | null = null;
  private readonly PING_INTERVAL = 30000;
  private readonly METERING_POLL_INTERVAL = 100; // Poll metering at 10Hz
  private channelSubscriptions: Map<WebSocket, ChannelSubscription> = new Map();
  private paramToClients: Map<string, Set<WebSocket>> = new Map(); // paramPath -> clients
  private meteringPaths: Set<string> = new Set(); // Paths that need polling (metering)

  constructor(
    private updateBatcher: UpdateBatcher,
    private emberService: EmberService,
    private oscService: OscService,
    private connectionManager: ConnectionManager
  ) {}

  attach(server: Server): void {
    this.wss = new WSServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });

    this.setupBatcherListener();
    this.setupServiceListeners();
    this.startPingInterval();
    this.startMeteringPolling();

    logger.info('WebSocket server attached');
  }

  private startMeteringPolling(): void {
    this.meteringInterval = setInterval(async () => {
      if (this.meteringPaths.size === 0) return;

      for (const path of this.meteringPaths) {
        try {
          const element = await this.emberService.getElementByPath(path);
          const value = element?.contents?.value;
          if (value !== undefined) {
            this.broadcastParamUpdate(path, value);
          }
        } catch {
          // Ignore errors during polling
        }
      }
    }, this.METERING_POLL_INTERVAL);
  }

  private handleConnection(ws: WebSocket): void {
    const client: WsClient = {
      ws,
      topics: new Set(['connections', 'status']),
      lastPing: Date.now(),
    };

    this.clients.set(ws, client);
    logger.info(`Client connected (${this.clients.size} total)`);

    this.sendInitialState(client);

    ws.on('message', (data: Buffer) => {
      try {
        const message: WsMessage = JSON.parse(data.toString());
        this.handleMessage(client, message);
      } catch {
        logger.warn('Invalid WebSocket message received');
      }
    });

    ws.on('close', () => {
      this.unsubscribeFromChannel(ws);
      this.clients.delete(ws);
      logger.info(`Client disconnected (${this.clients.size} remaining)`);
    });

    ws.on('pong', () => {
      client.lastPing = Date.now();
    });
  }

  private handleMessage(client: WsClient, message: WsMessage): void {
    switch (message.type) {
      case 'subscribe':
        if (message.topics) {
          message.topics.forEach(t => client.topics.add(t));
          logger.debug(`Client subscribed to: ${message.topics.join(', ')}`);
        }
        break;

      case 'unsubscribe':
        if (message.topics) {
          message.topics.forEach(t => client.topics.delete(t));
        }
        break;

      case 'ping':
        this.send(client.ws, { type: 'pong' });
        break;

      case 'channel:subscribe':
        if (message.params && message.params.length > 0) {
          this.subscribeToParams(client.ws, message.params);
        }
        break;

      case 'channel:unsubscribe':
        this.unsubscribeFromChannel(client.ws);
        break;
    }
  }

  private async subscribeToParams(ws: WebSocket, paramPaths: string[]): Promise<void> {
    // Unsubscribe from previous params
    this.unsubscribeFromChannel(ws);

    const subscription: ChannelSubscription = {
      channelPath: '',
      params: new Map()
    };

    const initialValues: Array<{ path: string; value: unknown }> = [];

    for (const paramPath of paramPaths) {
      if (!paramPath) continue;
      
      try {
        // Get current value first
        const element = await this.emberService.getElementByPath(paramPath);
        const currentValue = (element.contents as any)?.value;
        const description = (element.contents as any)?.description || '';

        // Track which clients are subscribed to this param
        // We listen to valueChange events instead of subscribing directly
        // because BridgeEngine may already have subscribed
        if (!this.paramToClients.has(paramPath)) {
          this.paramToClients.set(paramPath, new Set());
        }
        this.paramToClients.get(paramPath)!.add(ws);

        // If this is a metering parameter, add to polling set
        if (description.includes('Level')) {
          this.meteringPaths.add(paramPath);
          logger.debug(`Added metering path to polling: ${paramPath}`);
        }

        subscription.params.set(paramPath, paramPath);

        // Store initial value to send
        if (currentValue !== undefined) {
          initialValues.push({ path: paramPath, value: currentValue });
        }

        logger.debug(`WS client subscribed to param: ${paramPath}`);
      } catch (error) {
        logger.error(`Failed to subscribe to ${paramPath}:`, error);
      }
    }

    this.channelSubscriptions.set(ws, subscription);
    
    // Send confirmation with initial values
    this.send(ws, { 
      type: 'channel:subscribed', 
      params: paramPaths,
      initialValues 
    });
  }

  private unsubscribeFromChannel(ws: WebSocket): void {
    const subscription = this.channelSubscriptions.get(ws);
    if (!subscription) return;

    for (const paramPath of subscription.params.keys()) {
      const clients = this.paramToClients.get(paramPath);
      if (clients) {
        clients.delete(ws);
        // If no more clients, stop polling/subscribing
        if (clients.size === 0) {
          this.emberService.unsubscribeByPath(paramPath).catch(() => {});
          this.paramToClients.delete(paramPath);
          // Remove from metering polling if present
          this.meteringPaths.delete(paramPath);
        }
      }
    }

    this.channelSubscriptions.delete(ws);
  }

  private broadcastParamUpdate(paramPath: string, value: unknown): void {
    const clients = this.paramToClients.get(paramPath);
    if (!clients) return;

    const message = {
      type: 'param:update',
      data: { path: paramPath, value },
      timestamp: Date.now()
    };

    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        this.send(ws, message);
      }
    }
  }

  private sendInitialState(client: WsClient): void {
    const connections = this.connectionManager.getAll();
    const connectionData: Record<string, unknown> = {};

    for (const conn of connections) {
      connectionData[conn.id] = {
        emberValue: conn.currentEmberValue,
        oscValue: conn.currentOscValue,
        direction: conn.direction,
        isActive: conn.isActive,
        error: conn.error,
      };
    }

    this.send(client.ws, {
      type: 'connections:init',
      data: connectionData,
      timestamp: Date.now(),
    });

    this.send(client.ws, {
      type: 'status:update',
      data: this.getStatusData(),
      timestamp: Date.now(),
    });
  }

  private setupBatcherListener(): void {
    this.updateBatcher.on('batch', (batch) => {
      this.broadcast('connections', {
        type: 'connections:update',
        data: batch.data,
        timestamp: batch.timestamp,
      });
    });
  }

  private setupServiceListeners(): void {
    this.emberService.on('connected', () => {
      this.broadcastStatus();
    });

    this.emberService.on('disconnected', () => {
      this.broadcastStatus();
    });

    // Listen to all value changes from Ember+ and broadcast to interested WS clients
    this.emberService.on('valueChange', (path: string, value: unknown) => {
      this.broadcastParamUpdate(path, value);
    });

    this.connectionManager.on('created', (conn) => {
      this.broadcast('connections', {
        type: 'connection:created',
        data: conn,
        timestamp: Date.now(),
      });
    });

    this.connectionManager.on('deleted', (id) => {
      this.broadcast('connections', {
        type: 'connection:deleted',
        data: { id },
        timestamp: Date.now(),
      });
    });
  }

  private broadcastStatus(): void {
    this.broadcast('status', {
      type: 'status:update',
      data: this.getStatusData(),
      timestamp: Date.now(),
    });
  }

  private getStatusData(): unknown {
    return {
      ember: this.emberService.getConnectionStatus(),
      oscRx: {
        listening: this.oscService.getStatus().listening,
        port: this.oscService.getStatus().rxPort,
      },
      oscTx: {
        host: this.oscService.getStatus().txHost,
        port: this.oscService.getStatus().txPort,
      },
    };
  }

  private broadcast(topic: string, message: unknown): void {
    for (const [ws, client] of this.clients) {
      if (client.topics.has(topic) && ws.readyState === WebSocket.OPEN) {
        this.send(ws, message);
      }
    }
  }

  private send(ws: WebSocket, message: unknown): void {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error('Failed to send WebSocket message:', error);
    }
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      for (const [ws, client] of this.clients) {
        if (now - client.lastPing > this.PING_INTERVAL * 2) {
          ws.terminate();
          this.clients.delete(ws);
        } else if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }
    }, this.PING_INTERVAL);
  }

  close(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    if (this.wss) {
      this.wss.close();
    }
    this.clients.clear();
  }
}
