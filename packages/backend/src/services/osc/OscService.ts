import { EventEmitter } from 'events';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const osc = require('osc');
import { createLogger } from '../../utils/logger.js';
import type { ParameterType } from '../../types/index.js';

const logger = createLogger('OscService');

export interface OscArg {
  type: string;
  value: unknown;
}

export interface OscMessage {
  address: string;
  args: OscArg[];
}

export interface OscConfig {
  rxPort: number;
  txHost: string;
  txPort: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UDPPortType = any;

/**
 * OscService - Handles OSC UDP communication.
 * Manages incoming messages and outgoing transmissions.
 */
export class OscService extends EventEmitter {
  private udpPort: UDPPortType | null = null;
  private config: OscConfig;
  private isListening = false;

  constructor(config: OscConfig) {
    super();
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.udpPort) {
      await this.stop();
    }

    logger.info(`Starting OSC service on port ${this.config.rxPort}`);

    return new Promise((resolve, reject) => {
      this.udpPort = new osc.UDPPort({
        localAddress: '0.0.0.0',
        localPort: this.config.rxPort,
        metadata: true,
      });

      this.udpPort.on('ready', () => {
        this.isListening = true;
        logger.info(`OSC listening on port ${this.config.rxPort}`);
        this.emit('ready');
        resolve();
      });

      this.udpPort.on('message', (oscMsg: OscMessage) => {
        this.handleMessage(oscMsg);
      });

      this.udpPort.on('error', (error: Error) => {
        logger.error('OSC error:', error);
        this.emit('error', error);
        if (!this.isListening) {
          reject(error);
        }
      });

      this.udpPort.open();
    });
  }

  async stop(): Promise<void> {
    if (!this.udpPort) return;

    logger.info('Stopping OSC service');
    
    try {
      this.udpPort.close();
    } catch {
      // Ignore close errors
    }

    this.udpPort = null;
    this.isListening = false;
  }

  send(address: string, value: unknown, parameterType: ParameterType): void {
    if (!this.udpPort) {
      logger.warn('Cannot send OSC - not initialized');
      return;
    }

    const args = this.valueToOscArgs(value, parameterType);
    
    const message = {
      address,
      args,
    };

    this.udpPort.send(message, this.config.txHost, this.config.txPort);
    logger.debug(`OSC sent: ${address} = ${JSON.stringify(value)}`);
  }

  sendRaw(message: OscMessage): void {
    if (!this.udpPort) {
      logger.warn('Cannot send OSC - not initialized');
      return;
    }

    this.udpPort.send(message, this.config.txHost, this.config.txPort);
  }

  getStatus(): { listening: boolean; rxPort: number; txHost: string; txPort: number } {
    return {
      listening: this.isListening,
      rxPort: this.config.rxPort,
      txHost: this.config.txHost,
      txPort: this.config.txPort,
    };
  }

  private handleMessage(oscMsg: OscMessage): void {
    const address = oscMsg.address;
    const args = oscMsg.args || [];

    logger.debug(`OSC received: ${address} = ${JSON.stringify(args)}`);
    
    this.emit('message', address, args);
  }

  private valueToOscArgs(value: unknown, parameterType: ParameterType): OscArg[] {
    switch (parameterType) {
      case 'BOOLEAN':
        return [{
          type: value ? 'T' : 'F',
          value: value ? 1 : 0,
        }];

      case 'STRING':
        return [{
          type: 's',
          value: String(value),
        }];

      case 'INTEGER':
      case 'REAL':
      case 'ENUM':
      default:
        return [{
          type: 'f',
          value: Number(value),
        }];
    }
  }
}

/**
 * Parses OSC arguments to extract the primary value.
 */
export function parseOscValue(args: OscArg[]): unknown {
  if (!args || args.length === 0) return null;

  const arg = args[0];
  
  switch (arg.type) {
    case 'T':
      return true;
    case 'F':
      return false;
    case 's':
      return String(arg.value);
    case 'f':
    case 'i':
    case 'd':
      return Number(arg.value);
    default:
      return arg.value;
  }
}
