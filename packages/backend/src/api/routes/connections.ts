import { Router, Request, Response } from 'express';
import type { ConnectionManager } from '../../core/ConnectionManager.js';
import type { BridgeEngine } from '../../services/bridge/BridgeEngine.js';
import type { EmberService } from '../../services/ember/EmberService.js';
import type { ConnectionConfig } from '../../types/index.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('api:connections');

export function createConnectionsRouter(
  connectionManager: ConnectionManager,
  bridgeEngine: BridgeEngine,
  emberService: EmberService
): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    try {
      const connections = connectionManager.getAll();
      res.json({
        success: true,
        data: connections,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get connections:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get connections' },
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    try {
      const conn = connectionManager.get(req.params.id);
      if (!conn) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Connection ${req.params.id} not found` },
          timestamp: new Date().toISOString(),
        });
      }
      res.json({
        success: true,
        data: conn,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get connection:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get connection' },
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    try {
      const config: ConnectionConfig = req.body;
      
      if (!config.emberPath || !config.oscAddress) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'emberPath and oscAddress are required' },
          timestamp: new Date().toISOString(),
        });
      }

      // Auto-detect parameterType from Ember+ element if not provided
      if (!config.parameterType && emberService.getConnectionStatus().connected) {
        try {
          await emberService.expandPath(config.emberPath);
          const element = await emberService.getElementByPath(config.emberPath);
          if (element?.contents?.parameterType) {
            config.parameterType = element.contents.parameterType as ConnectionConfig['parameterType'];
            logger.info(`Auto-detected parameterType: ${config.parameterType} for ${config.emberPath}`);
          }
        } catch (err) {
          logger.debug(`Could not auto-detect parameterType: ${err}`);
        }
      }

      const conn = connectionManager.create(config);
      logger.info(`Created connection: ${conn.id}`);
      
      res.status(201).json({
        success: true,
        data: conn,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to create connection:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create connection' },
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.put('/:id', (req: Request, res: Response) => {
    try {
      const changes: Partial<ConnectionConfig> = req.body;
      const conn = connectionManager.update(req.params.id, changes);
      logger.info(`Updated connection: ${conn.id}`);
      
      res.json({
        success: true,
        data: conn,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message },
          timestamp: new Date().toISOString(),
        });
      }
      logger.error('Failed to update connection:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update connection' },
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      await bridgeEngine.deactivateConnection(req.params.id);
      connectionManager.delete(req.params.id);
      logger.info(`Deleted connection: ${req.params.id}`);
      
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete connection:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete connection' },
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.post('/:id/activate', async (req: Request, res: Response) => {
    try {
      await bridgeEngine.activateConnection(req.params.id);
      const conn = connectionManager.get(req.params.id);
      
      res.json({
        success: true,
        data: conn,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to activate connection:', error);
      res.status(500).json({
        success: false,
        error: { code: 'ACTIVATION_ERROR', message },
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.post('/:id/deactivate', async (req: Request, res: Response) => {
    try {
      await bridgeEngine.deactivateConnection(req.params.id);
      const conn = connectionManager.get(req.params.id);
      
      res.json({
        success: true,
        data: conn,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to deactivate connection:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to deactivate connection' },
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.post('/activate-all', async (_req: Request, res: Response) => {
    try {
      const result = await bridgeEngine.activateAllConnections();
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to activate all connections:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to activate connections' },
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}
