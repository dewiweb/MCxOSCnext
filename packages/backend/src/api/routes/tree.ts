import { Router, Request, Response } from 'express';
import type { EmberService, EmberElement } from '../../services/ember/EmberService.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('api:tree');

export function createTreeRouter(emberService: EmberService): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    try {
      const status = emberService.getConnectionStatus();
      if (!status.connected) {
        return res.status(503).json({
          success: false,
          error: { code: 'NOT_CONNECTED', message: 'Not connected to Ember+ server' },
          timestamp: new Date().toISOString(),
        });
      }

      // Use ?refresh=true to force reload from Ember+ (slower)
      const forceRefresh = req.query.refresh === 'true';
      const tree = await emberService.getTree(forceRefresh);
      const nodes = tree.map((el) => formatElement(el, String(el.number), undefined));

      res.json({
        success: true,
        data: nodes,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to get tree:', error);
      res.status(500).json({
        success: false,
        error: { code: 'TREE_ERROR', message },
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.get('/:path(*)', async (req: Request, res: Response) => {
    try {
      const status = emberService.getConnectionStatus();
      if (!status.connected) {
        return res.status(503).json({
          success: false,
          error: { code: 'NOT_CONNECTED', message: 'Not connected to Ember+ server' },
          timestamp: new Date().toISOString(),
        });
      }

      const path = req.params.path.replace(/\//g, '.');
      const element = await emberService.getElementByPath(path);

      // Debug: log raw element to see what's available
      if (req.query.debug === 'true') {
        logger.info(`Raw element at ${path}: ${JSON.stringify(element, null, 2)}`);
        return res.json({
          success: true,
          data: element,
          timestamp: new Date().toISOString(),
        });
      }

      const parentIdentifierPath = req.query.parentIdentifierPath as string | undefined;
      res.json({
        success: true,
        data: formatElement(element, path, parentIdentifierPath),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Element not found at path: ${req.params.path}` },
          timestamp: new Date().toISOString(),
        });
      }
      logger.error('Failed to get element:', error);
      res.status(500).json({
        success: false,
        error: { code: 'TREE_ERROR', message },
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.post('/:path(*)/expand', async (req: Request, res: Response) => {
    try {
      const status = emberService.getConnectionStatus();
      if (!status.connected) {
        return res.status(503).json({
          success: false,
          error: { code: 'NOT_CONNECTED', message: 'Not connected to Ember+ server' },
          timestamp: new Date().toISOString(),
        });
      }

      const path = req.params.path.replace(/\//g, '.');
      const children = await emberService.expandNode(path);
      const parentIdentifierPath = req.query.parentIdentifierPath as string | undefined;
      const nodes = children.map((el) => formatElement(el, `${path}.${el.number}`, parentIdentifierPath));

      res.json({
        success: true,
        data: nodes,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to expand node:', error);
      res.status(500).json({
        success: false,
        error: { code: 'TREE_ERROR', message },
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}

function formatElement(element: EmberElement, path: string, parentIdentifierPath: string | undefined): unknown {
  const contents = element.contents || {};
  const type = contents.type || 'NODE';
  
  // NODE types can have children, PARAMETER types cannot
  const hasChildren = type === 'NODE' || type === 'MATRIX';
  
  // Use description, fallback to identifier (like old Electron app)
  const description = contents.description || contents.identifier;

  // Build cumulative identifier path (stable across production file reloads)
  const ownIdentifier = contents.identifier as string | undefined;
  const identifierPath = ownIdentifier
    ? (parentIdentifierPath ? `${parentIdentifierPath}.${ownIdentifier}` : ownIdentifier)
    : undefined;
  
  return {
    path,
    number: element.number,
    type,
    description,
    identifier: ownIdentifier,
    identifierPath,
    value: contents.value,
    parameterType: contents.parameterType,
    minimum: contents.minimum,
    maximum: contents.maximum,
    factor: contents.factor,
    enumeration: contents.enumeration,
    hasChildren,
    isMatrix: type === 'MATRIX',
    isFunction: type === 'FUNCTION',
    targetCount: contents.targetCount,
    sourceCount: contents.sourceCount,
  };
}
