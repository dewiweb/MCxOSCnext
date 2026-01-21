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
}

/**
 * WebSocketManager - Manages WebSocket connections for real-time updates.
 * Broadcasts batched connection updates to subscribed clients.
 */
export class WebSocketManager {
  private wss: WSServer | null = null;
  private clients: Map<WebSocket, WsClient> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly PING_INTERVAL = 30000;

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

    logger.info('WebSocket server attached');
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
