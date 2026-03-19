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

export interface MatrixConnectionRaw {
  target: number;
  sources: number[];
}

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
    identifier?: string;
    enumeration?: string;
    targetCount?: number;
    sourceCount?: number;
    mode?: number;
    connections?: Record<number, MatrixConnectionRaw>;
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
      timeout: 30000,  // Increased timeout for large trees (Lawo consoles)
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

  async getTree(forceRefresh = false): Promise<EmberElement[]> {
    this.ensureConnected();
    
    const tree = this.client!.tree;
    
    // Only request directory if tree is empty or force refresh
    const hasChildren = tree && Object.keys(tree).some(k => !isNaN(Number(k)));
    if (forceRefresh || !hasChildren) {
      try {
        await (await this.client!.getDirectory(tree)).response;
      } catch (err) {
        logger.debug('getDirectory timeout, using cached tree');
      }
    }
    
    // Return root level nodes
    const rootElements: EmberElement[] = [];
    
    if (tree && typeof tree === 'object') {
      for (const key of Object.keys(tree)) {
        if (key !== 'path' && key !== 'contents' && !isNaN(Number(key))) {
          const element = tree[key];
          if (element && typeof element === 'object') {
            rootElements.push({
              ...element,
              number: element.number ?? Number(key),
              path: String(element.number ?? key),
            } as EmberElement);
          }
        }
      }
    }
    
    return rootElements;
  }

  async getElementByPath(path: string): Promise<EmberElement> {
    this.ensureConnected();
    
    const element = await this.client!.getElementByPath(path);
    if (!element) {
      throw new Error(`Element not found at path: ${path}`);
    }
    return element as EmberElement;
  }

  /**
   * Expand path step by step to ensure element is accessible.
   * Required after reconnection when tree cache is empty.
   */
  async expandPath(path: string): Promise<void> {
    this.ensureConnected();
    
    // Ensure root directory is loaded only if not already populated
    const tree = this.client!.tree;
    const rootHasChildren = tree && Object.keys(tree).some((k: string) => !isNaN(Number(k)));
    if (!rootHasChildren) {
      try {
        await (await this.client!.getDirectory(tree)).response;
      } catch (err) {
        logger.debug(`Could not get root directory: ${err}`);
      }
    }
    
    const parts = path.split('.');
    let currentPath = '';
    
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}.${parts[i]}` : parts[i];
      try {
        const element = await this.client!.getElementByPath(currentPath);
        if (element && element.contents.type === 'NODE') {
          await (await this.client!.getDirectory(element)).response;
        }
      } catch (err) {
        logger.debug(`Could not expand ${currentPath}: ${err}`);
      }
    }
  }

  async getDirectory(element: EmberElement): Promise<EmberElement[]> {
    this.ensureConnected();
    
    const result = await (await this.client!.getDirectory(element)).response;
    return result as EmberElement[];
  }

  async expandNode(path: string): Promise<EmberElement[]> {
    this.ensureConnected();
    
    const element = await this.getElementByPath(path);
    
    // Matrices and parameters don't have children to navigate
    if (element.contents.type === 'MATRIX' || element.contents.type === 'PARAMETER') {
      return [];
    }
    
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

  async subscribe(path: string, callback: ValueCallback, skipExpand = false): Promise<void> {
    this.ensureConnected();

    if (this.subscriptions.has(path)) {
      logger.warn(`Already subscribed to ${path}`);
      return;
    }

    // Expand path first to ensure element is accessible after reconnect
    // Skip if already expanded by activateAllConnections
    if (!skipExpand) {
      await this.expandPath(path);
    }
    
    const element = await this.getElementByPath(path);
    
    // The emberplus-connection library passes the updated node to the callback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrappedCallback = (updatedNode: any) => {
      const value = updatedNode?.contents?.value ?? element.contents.value;
      logger.debug(`Value update received for ${path}: ${value}`);
      callback(value);
      this.emit('valueChange', path, value);
    };

    this.client!.subscribe(element, wrappedCallback);
    this.subscriptions.set(path, { element, callback: wrappedCallback as ValueCallback });
    
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

  /**
   * Resolves an identifier-based path (e.g. "_2._1._3ee") to a numeric path (e.g. "28548.28549.56889").
   * Identifiers are stable across production file reloads, unlike numeric paths.
   * Each segment is matched against the `identifier` field of Ember+ nodes.
   */
  async resolveIdentifierPath(identifierPath: string): Promise<string> {
    this.ensureConnected();

    const segments = identifierPath.split('.');
    const resolvedParts: string[] = [];

    // Ensure root is loaded
    const tree = this.client!.tree;
    const hasChildren = tree && Object.keys(tree).some((k: string) => !isNaN(Number(k)));
    if (!hasChildren) {
      try {
        await (await this.client!.getDirectory(tree)).response;
      } catch {
        logger.debug('resolveIdentifierPath: root getDirectory timeout');
      }
    }

    for (let i = 0; i < segments.length; i++) {
      const targetIdentifier = segments[i];
      const currentNumericPath = resolvedParts.join('.');

      // Get children of current level
      let currentNode: EmberElementRaw;
      if (currentNumericPath === '') {
        currentNode = this.client!.tree;
      } else {
        currentNode = await this.client!.getElementByPath(currentNumericPath);
        if (!currentNode) {
          throw new Error(`resolveIdentifierPath: node not found at "${currentNumericPath}" while resolving "${identifierPath}"`);
        }
        // Expand to load children
        try {
          await (await this.client!.getDirectory(currentNode)).response;
        } catch {
          logger.debug(`resolveIdentifierPath: getDirectory timeout at ${currentNumericPath}`);
        }
      }

      // Search children for matching identifier
      // Children may be in currentNode directly (numeric keys) or in currentNode.children
      const nodeToSearch = currentNode.children ?? currentNode;
      const childKeys = Object.keys(nodeToSearch).filter(k => !isNaN(Number(k)));

      let found = false;
      for (const key of childKeys) {
        const child = nodeToSearch[key];
        if (child?.contents?.identifier === targetIdentifier) {
          const childNumber = child.number ?? Number(key);
          resolvedParts.push(String(childNumber));
          found = true;
          break;
        }
      }

      if (!found) {
        throw new Error(`resolveIdentifierPath: identifier "${targetIdentifier}" not found at level ${i} of "${identifierPath}"`);
      }
    }

    const resolved = resolvedParts.join('.');
    logger.debug(`Resolved identifier path "${identifierPath}" → "${resolved}"`);
    return resolved;
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
