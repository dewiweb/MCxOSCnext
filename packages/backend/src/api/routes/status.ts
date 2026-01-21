import { Router, Request, Response } from 'express';
import type { EmberService } from '../../services/ember/EmberService.js';
import type { OscService } from '../../services/osc/OscService.js';
import type { ConnectionManager } from '../../core/ConnectionManager.js';

export function createStatusRouter(
  emberService: EmberService,
  oscService: OscService,
  connectionManager: ConnectionManager
): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const emberStatus = emberService.getConnectionStatus();
    const oscStatus = oscService.getStatus();
    const connections = connectionManager.getAll();
    const activeCount = connections.filter(c => c.isActive).length;

    res.json({
      success: true,
      data: {
        ember: {
          connected: emberStatus.connected,
          host: emberStatus.host,
          port: emberStatus.port,
        },
        oscRx: {
          listening: oscStatus.listening,
          port: oscStatus.rxPort,
        },
        oscTx: {
          host: oscStatus.txHost,
          port: oscStatus.txPort,
        },
        connections: {
          total: connections.length,
          active: activeCount,
        },
      },
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/ember', (_req: Request, res: Response) => {
    const status = emberService.getConnectionStatus();
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/osc', (_req: Request, res: Response) => {
    const status = oscService.getStatus();
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
