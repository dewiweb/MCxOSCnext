import { EventEmitter } from 'events';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { EmberClient } = require('emberplus-connection');
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('EmberService');

// Using 'any' for emberplus-connection types as it's a JS library without proper TS types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EmberClientType = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EmberElementRaw = any;

export interface EmberElement {
  path: string;
  contents: {
    type: string;
    parameterType?: string;
    value?: unknown;
    minimum?: number;
    maximum?: number;
    factor?: number;
    description?: string;
    enumeration?: string;
    targetCount?: number;
    sourceCount?: number;
    args?: unknown[];
  };
  children?: Record<string, unknown>;
  number?: number;
}

export interface EmberConfig {
  host: string;
  port: number;
  timeout?: number;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

type ValueCallback = (value: unknown) => void;

/**
 * EmberService - Wrapper for emberplus-connection library.
 * Handles Ember+ TCP connection and provides async API.
 */
export class EmberService extends EventEmitter {
  private client: EmberClientType | null = null;
  private config: EmberConfig;
  private subscriptions: Map<string, { element: EmberElementRaw; callback: ValueCallback }> = new Map();
  private isConnected = false;

  constructor(config: EmberConfig) {
    super();
    this.config = {
      timeout: 10000,
      autoReconnect: true,
      reconnectInterval: 5000,
      ...config,
    };
  }

  async connect(): Promise<void> {
    if (this.client) {
      await this.disconnect();
    }

    logger.info(`Connecting to Ember+ at ${this.config.host}:${this.config.port}`);

    this.client = new EmberClient(
      this.config.host,
      this.config.port,
      this.config.timeout,
      this.config.autoReconnect,
      this.config.reconnectInterval
    );

    this.setupEventHandlers();

    const error = await this.client.connect();
    if (error) {
      logger.error(`Connection failed: ${error}`);
      throw new Error(`Failed to connect to Ember+ at ${this.config.host}:${this.config.port}`);
    }

    this.isConnected = true;
    logger.info('Connected to Ember+ server');
  }

  async disconnect(): Promise<void> {
    if (!this.client) return;

    logger.info('Disconnecting from Ember+ server');
    
    for (const [path] of this.subscriptions) {
      try {
        await this.unsubscribeByPath(path);
      } catch {
        // Ignore errors during cleanup
      }
    }
    this.subscriptions.clear();

    try {
      await this.client.disconnect();
    } catch {
      // Ignore disconnect errors
    }

    this.client = null;
    this.isConnected = false;
  }

  async getTree(): Promise<EmberElement[]> {
    this.ensureConnected();
    
    await (await this.client!.getDirectory(this.client!.tree)).response;
    return this.client!.tree.flat(0) as EmberElement[];
  }

  async getElementByPath(path: string): Promise<EmberElement> {
    this.ensureConnected();
    
    const element = await this.client!.getElementByPath(path);
    if (!element) {
      throw new Error(`Element not found at path: ${path}`);
    }
    return element as EmberElement;
  }

  async getDirectory(element: EmberElement): Promise<EmberElement[]> {
    this.ensureConnected();
    
    const result = await (await this.client!.getDirectory(element)).response;
    return result as EmberElement[];
  }

  async expandNode(path: string): Promise<EmberElement[]> {
    this.ensureConnected();
    
    const element = await this.getElementByPath(path);
    if (element.contents.type !== 'NODE') {
      throw new Error(`Element at ${path} is not a NODE`);
    }

    await this.getDirectory(element);
    
    const children: EmberElement[] = [];
    if (element.children) {
      for (const childNum of Object.keys(element.children)) {
        const childPath = `${path}.${childNum}`;
        try {
          const child = await this.getElementByPath(childPath);
          children.push(child);
        } catch {
          // Skip inaccessible children
        }
      }
    }
    
    return children;
  }

  async subscribe(path: string, callback: ValueCallback): Promise<void> {
    this.ensureConnected();

    if (this.subscriptions.has(path)) {
      logger.warn(`Already subscribed to ${path}`);
      return;
    }

    const element = await this.getElementByPath(path);
    
    const wrappedCallback = () => {
      const value = element.contents.value;
      callback(value);
      this.emit('valueChange', path, value);
    };

    this.client!.subscribe(element, wrappedCallback);
    this.subscriptions.set(path, { element, callback: wrappedCallback });
    
    logger.debug(`Subscribed to ${path}`);
  }

  async unsubscribeByPath(path: string): Promise<void> {
    this.ensureConnected();

    const subscription = this.subscriptions.get(path);
    if (!subscription) {
      return;
    }

    this.client!.unsubscribe(subscription.element);
    this.subscriptions.delete(path);
    
    logger.debug(`Unsubscribed from ${path}`);
  }

  async setValue(path: string, value: unknown): Promise<void> {
    this.ensureConnected();

    const element = await this.getElementByPath(path);
    await this.client!.setValue(element, value);
    
    logger.debug(`Set value at ${path}: ${value}`);
  }

  async matrixSetConnection(path: string, target: number, sources: number[]): Promise<void> {
    this.ensureConnected();

    const element = await this.getElementByPath(path);
    if (element.contents.type !== 'MATRIX') {
      throw new Error(`Element at ${path} is not a MATRIX`);
    }

    await this.client!.matrixSetConnection(element, target, sources);
    logger.debug(`Matrix connection set at ${path}: target=${target}, sources=${sources}`);
  }

  async invoke(path: string): Promise<unknown> {
    this.ensureConnected();

    const element = await this.getElementByPath(path);
    if (element.contents.type !== 'FUNCTION') {
      throw new Error(`Element at ${path} is not a FUNCTION`);
    }

    const result = await (await this.client!.invoke(element)).response;
    return result;
  }

  getConnectionStatus(): { connected: boolean; host: string; port: number } {
    return {
      connected: this.isConnected,
      host: this.config.host,
      port: this.config.port,
    };
  }

  async resubscribeAll(): Promise<void> {
    const paths = Array.from(this.subscriptions.keys());
    const callbacks = new Map<string, ValueCallback>();
    
    for (const [path, sub] of this.subscriptions) {
      callbacks.set(path, sub.callback);
    }
    
    this.subscriptions.clear();

    for (const path of paths) {
      const callback = callbacks.get(path);
      if (callback) {
        try {
          await this.subscribe(path, callback);
        } catch (error) {
          logger.error(`Failed to resubscribe to ${path}:`, error);
        }
      }
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connected', () => {
      this.isConnected = true;
      logger.info('Ember+ connected');
      this.emit('connected');
    });

    this.client.on('disconnected', () => {
      this.isConnected = false;
      logger.warn('Ember+ disconnected');
      this.emit('disconnected');
    });

    this.client.on('error', (error: Error) => {
      logger.error('Ember+ error:', error);
      this.emit('error', error);
    });
  }

  private ensureConnected(): void {
    if (!this.client || !this.isConnected) {
      throw new Error('Not connected to Ember+ server');
    }
  }
}
