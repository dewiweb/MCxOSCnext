import { Router, Request, Response } from 'express';
import { EmberService } from '../../services/ember/EmberService.js';
import { createLogger } from '../../utils/logger.js';
import type { MatrixInfo, MatrixConnection, MatrixConnectionsPage } from '../../types/index.js';

const logger = createLogger('matrix-api');

export function createMatrixRouter(emberService: EmberService): Router {
  const router = Router();

  /**
   * GET /matrix/:path - Get matrix info and connections (paginated)
   * Query params:
   *   - targetOffset: starting target index (default 0)
   *   - targetLimit: max targets to return (default 50, max 200)
   */
  router.get('/:path(*)', async (req: Request, res: Response) => {
    try {
      const path = req.params.path;
      const targetOffset = Math.max(0, parseInt(req.query.targetOffset as string) || 0);
      const targetLimit = Math.min(200, Math.max(1, parseInt(req.query.targetLimit as string) || 50));

      logger.info(`Getting matrix at path: ${path} (offset=${targetOffset}, limit=${targetLimit})`);

      const element = await emberService.getElementByPath(path);
      
      if (!element || !element.contents || element.contents.type !== 'MATRIX') {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_MATRIX', message: `Element at ${path} is not a matrix` },
          timestamp: new Date().toISOString()
        });
      }

      const contents = element.contents;
      const matrixInfo: MatrixInfo = {
        path,
        identifier: contents.identifier,
        description: contents.description,
        targetCount: contents.targetCount || 0,
        sourceCount: contents.sourceCount || 0,
        mode: contents.mode === 1 ? 'nonLinear' : 'linear'
      };

      // Get connections for the requested page of targets
      const connections: MatrixConnection[] = [];
      const allConnections = contents.connections || {};
      
      const targetIds = Object.keys(allConnections)
        .map(Number)
        .sort((a, b) => a - b);
      
      const pagedTargetIds = targetIds.slice(targetOffset, targetOffset + targetLimit);
      
      for (const targetId of pagedTargetIds) {
        const conn = allConnections[targetId];
        if (conn) {
          connections.push({
            target: targetId,
            sources: Array.isArray(conn.sources) ? conn.sources : []
          });
        }
      }

      const response: MatrixConnectionsPage = {
        matrix: matrixInfo,
        connections,
        pagination: {
          targetOffset,
          targetLimit,
          totalTargets: matrixInfo.targetCount
        }
      };

      res.json({
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error getting matrix:', error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'MATRIX_ERROR', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * POST /matrix/:path/connect - Set a matrix connection
   * Body: { target: number, sources: number[] }
   */
  router.post('/:path(*)/connect', async (req: Request, res: Response) => {
    try {
      const path = req.params.path;
      const { target, sources } = req.body;

      if (typeof target !== 'number' || !Array.isArray(sources)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'target (number) and sources (number[]) required' },
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`Setting matrix connection: ${path} target=${target} sources=${JSON.stringify(sources)}`);

      const element = await emberService.getElementByPath(path);
      
      if (!element || !element.contents || element.contents.type !== 'MATRIX') {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_MATRIX', message: `Element at ${path} is not a matrix` },
          timestamp: new Date().toISOString()
        });
      }

      await emberService.matrixSetConnection(path, target, sources);

      res.json({
        success: true,
        data: { path, target, sources },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error setting matrix connection:', error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'MATRIX_ERROR', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * POST /matrix/:path/disconnect - Disconnect a target (set sources to empty)
   * Body: { target: number }
   */
  router.post('/:path(*)/disconnect', async (req: Request, res: Response) => {
    try {
      const path = req.params.path;
      const { target } = req.body;

      if (typeof target !== 'number') {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'target (number) required' },
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`Disconnecting matrix target: ${path} target=${target}`);

      const element = await emberService.getElementByPath(path);
      
      if (!element || !element.contents || element.contents.type !== 'MATRIX') {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_MATRIX', message: `Element at ${path} is not a matrix` },
          timestamp: new Date().toISOString()
        });
      }

      await emberService.matrixSetConnection(path, target, []);

      res.json({
        success: true,
        data: { path, target, sources: [] },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error disconnecting matrix target:', error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'MATRIX_ERROR', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}
