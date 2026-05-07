import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  handleCreateSessionLog,
  handleGetRecentSessionLogs,
  handleGetSessionLogStats,
} from '../controllers/session-log.controller.js';

const sessionLogRouter = new Hono();

// OWASP A01: toutes les routes session-log necessitent une session valide
sessionLogRouter.use('*', authMiddleware);

// POST /session-logs - journaliser une seance terminee
sessionLogRouter.post('/', handleCreateSessionLog);

// GET /session-logs/recent - derniers journaux de l'utilisateur connecte
sessionLogRouter.get('/recent', handleGetRecentSessionLogs);

// GET /session-logs/stats - statistiques des seances terminees
sessionLogRouter.get('/stats', handleGetSessionLogStats);

export { sessionLogRouter };
