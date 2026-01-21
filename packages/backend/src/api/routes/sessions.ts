import { Router, Request, Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ConnectionManager } from '../../core/ConnectionManager.js';
import type { BridgeEngine } from '../../services/bridge/BridgeEngine.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('api:sessions');

const SESSIONS_DIR = process.env.SESSIONS_DIR || './sessions';

export function createSessionsRouter(
  connectionManager: ConnectionManager,
  bridgeEngine: BridgeEngine
): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    try {
      await fs.mkdir(SESSIONS_DIR, { recursive: true });
      const files = await fs.readdir(SESSIONS_DIR);
      const sessions = files
        .filter(f => f.endsWith('.session') || f.endsWith('.mcxosc'))
        .map(f => ({
          name: f.replace(/\.(session|mcxosc)$/, ''),
          filename: f,
        }));

      res.json({
        success: true,
        data: sessions,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to list sessions:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list sessions' },
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.get('/:name', async (req: Request, res: Response) => {
    try {
      const sessionPath = await findSessionFile(req.params.name);
      if (!sessionPath) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Session ${req.params.name} not found` },
          timestamp: new Date().toISOString(),
        });
      }

      await bridgeEngine.deactivateAllConnections();

      const content = await fs.readFile(sessionPath, 'utf-8');
      const data = JSON.parse(content);
      connectionManager.importSession(data);

      logger.info(`Loaded session: ${req.params.name} (${connectionManager.getAll().length} connections)`);

      const result = await bridgeEngine.activateAllConnections();

      res.json({
        success: true,
        data: {
          name: req.params.name,
          connections: connectionManager.getAll().length,
          activated: result.success,
          failed: result.failed,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to load session:', error);
      res.status(500).json({
        success: false,
        error: { code: 'LOAD_ERROR', message },
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.put('/:name', async (req: Request, res: Response) => {
    try {
      await fs.mkdir(SESSIONS_DIR, { recursive: true });
      
      const filename = `${req.params.name}.mcxosc`;
      const sessionPath = path.join(SESSIONS_DIR, filename);
      const session = connectionManager.exportSession();
      session.metadata = {
        ...session.metadata,
        name: req.params.name,
        updatedAt: new Date().toISOString(),
      };

      await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));
      logger.info(`Saved session: ${req.params.name}`);

      res.json({
        success: true,
        data: {
          name: req.params.name,
          filename,
          connections: session.connections.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to save session:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SAVE_ERROR', message: 'Failed to save session' },
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'name is required' },
          timestamp: new Date().toISOString(),
        });
      }

      await fs.mkdir(SESSIONS_DIR, { recursive: true });
      
      const filename = `${name}.mcxosc`;
      const sessionPath = path.join(SESSIONS_DIR, filename);
      
      try {
        await fs.access(sessionPath);
        return res.status(409).json({
          success: false,
          error: { code: 'CONFLICT', message: `Session ${name} already exists` },
          timestamp: new Date().toISOString(),
        });
      } catch {
        // File doesn't exist, continue
      }

      const session = connectionManager.exportSession();
      session.metadata = {
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));
      logger.info(`Created session: ${name}`);

      res.status(201).json({
        success: true,
        data: {
          name,
          filename,
          connections: session.connections.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to create session:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create session' },
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.delete('/:name', async (req: Request, res: Response) => {
    try {
      const sessionPath = await findSessionFile(req.params.name);
      if (!sessionPath) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Session ${req.params.name} not found` },
          timestamp: new Date().toISOString(),
        });
      }

      await fs.unlink(sessionPath);
      logger.info(`Deleted session: ${req.params.name}`);

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete session:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete session' },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Export current session as downloadable file
  router.get('/export/current', (_req: Request, res: Response) => {
    try {
      const session = connectionManager.exportSession();
      const filename = `mcxosc-session-${Date.now()}.mcxosc`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(session);
    } catch (error) {
      logger.error('Failed to export session:', error);
      res.status(500).json({
        success: false,
        error: { code: 'EXPORT_ERROR', message: 'Failed to export session' },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Export legacy format (.session)
  router.get('/export/legacy', (_req: Request, res: Response) => {
    try {
      const session = connectionManager.exportLegacySession();
      const filename = `mcxosc-session-${Date.now()}.session`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(session);
    } catch (error) {
      logger.error('Failed to export legacy session:', error);
      res.status(500).json({
        success: false,
        error: { code: 'EXPORT_ERROR', message: 'Failed to export session' },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Import session from uploaded file
  router.post('/import', async (req: Request, res: Response) => {
    try {
      const sessionData = req.body;
      
      if (!sessionData) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'No session data provided' },
          timestamp: new Date().toISOString(),
        });
      }

      await bridgeEngine.deactivateAllConnections();
      connectionManager.importSession(sessionData);

      logger.info(`Imported session with ${connectionManager.getAll().length} connections`);

      const result = await bridgeEngine.activateAllConnections();

      res.json({
        success: true,
        data: {
          connections: connectionManager.getAll().length,
          activated: result.success,
          failed: result.failed,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to import session:', error);
      res.status(500).json({
        success: false,
        error: { code: 'IMPORT_ERROR', message },
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}

async function findSessionFile(name: string): Promise<string | null> {
  const extensions = ['.mcxosc', '.session'];
  
  for (const ext of extensions) {
    const filePath = path.join(SESSIONS_DIR, `${name}${ext}`);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      // Continue to next extension
    }
  }
  
  return null;
}
