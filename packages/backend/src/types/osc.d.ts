declare module 'osc' {
  export interface OscMessage {
    address: string;
    args?: OscArg[];
  }

  export interface OscArg {
    type: string;
    value: unknown;
  }

  export interface UDPPortOptions {
    localAddress?: string;
    localPort?: number;
    remoteAddress?: string;
    remotePort?: number;
    metadata?: boolean;
  }

  export class UDPPort {
    constructor(options: UDPPortOptions);
    on(event: 'ready', callback: () => void): void;
    on(event: 'message', callback: (message: OscMessage) => void): void;
    on(event: 'error', callback: (error: Error) => void): void;
    open(): void;
    close(): void;
    send(message: OscMessage, address: string, port: number): void;
  }

  const osc: {
    UDPPort: typeof UDPPort;
  };

  export default osc;
}
