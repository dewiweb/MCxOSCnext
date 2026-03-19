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

      const startTime = Date.now();
      logger.info(`Getting matrix at path: ${path}`);

      // Try to get element directly first (faster if already cached)
      let element;
      const t1 = Date.now();
      try {
        element = await emberService.getElementByPath(path);
        logger.debug(`[TIMING] getElementByPath (cached): ${Date.now() - t1}ms`);
      } catch {
        // Not cached, need to expand path first
        const t2 = Date.now();
        await emberService.expandPath(path);
        logger.debug(`[TIMING] expandPath: ${Date.now() - t2}ms`);
        element = await emberService.getElementByPath(path);
      }
      
      // Call getDirectory to load full matrix details
      const t3 = Date.now();
      try {
        await emberService.getDirectory(element);
      } catch (err) {
        logger.warn(`getDirectory timeout after ${Date.now() - t3}ms`);
      }
      logger.debug(`[TIMING] getDirectory: ${Date.now() - t3}ms`);
      
      // Access matrix properties via element (updated by getDirectory)
      
      if (!element || !element.contents || element.contents.type !== 'MATRIX') {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_MATRIX', message: `Element at ${path} is not a matrix` },
          timestamp: new Date().toISOString()
        });
      }

      const contents = element.contents as Record<string, unknown>;
      
      // Get target/source counts - use array length as fallback for non-linear matrices
      const targets = contents.targets as number[] | undefined;
      const sources = contents.sources as number[] | undefined;
      const targetCount = (contents.targetCount as number) || targets?.length || 0;
      const sourceCount = (contents.sourceCount as number) || sources?.length || 0;
      
      logger.debug(`Matrix: ${targetCount}x${sourceCount}, mode=${contents.addressingMode}`);
      
      const matrixInfo: MatrixInfo = {
        path,
        identifier: contents.identifier as string,
        description: contents.description as string | undefined,
        targetCount,
        sourceCount,
        mode: contents.addressingMode === 'NON_LINEAR' ? 'nonLinear' : 'linear',
        targets: targets || [],
        sources: sources || []
      };

      // Get connections for the requested page of targets
      const connections: MatrixConnection[] = [];
      const allConnections = (contents.connections || {}) as Record<number, { sources?: number[] }>;
      
      // Debug logging removed for production
      
      const targetIds = Object.keys(allConnections)
        .map(Number)
        .sort((a, b) => a - b);
      
      const pagedTargetIds = targetIds.slice(targetOffset, targetOffset + targetLimit);
      
      // Return ALL connections, not just paged ones (pagination was for large matrices but causes issues)
      for (const targetId of targetIds) {
        const conn = allConnections[targetId];
        if (conn) {
          const sources = Array.isArray(conn.sources) ? conn.sources : 
                         (conn as unknown as { target: number; sources: number[] }).sources || [];
          connections.push({
            target: targetId,
            sources
          });
        }
      }
      
      logger.info(`Matrix ${path}: ${matrixInfo.targetCount}x${matrixInfo.sourceCount}, ${connections.length} connections in ${Date.now() - startTime}ms`);

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
