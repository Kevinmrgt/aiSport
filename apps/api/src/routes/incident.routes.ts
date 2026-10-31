import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { handleBrowserIncident } from '../controllers/incident.controller.js';
import { AppError } from '../types/app-error.js';
const windows = new Map<string, { count: number; resetAt: number }>();
const MAX_IDENTITIES = 2000;
export const incidentRouter = new Hono();
incidentRouter.use('*', authMiddleware);
incidentRouter.post(
  '/',
  async (ctx, next) => {
    const now = Date.now();
    const key = ctx.get('auth').userId;
    let window = windows.get(key);
    if (!window || window.resetAt <= now) {
      if (windows.size >= MAX_IDENTITIES) {
        for (const [id, candidate] of windows) if (candidate.resetAt <= now) windows.delete(id);
        if (windows.size >= MAX_IDENTITIES && !windows.has(key))
          throw AppError.tooManyRequests('Signalement temporairement indisponible');
      }
      window = { count: 0, resetAt: now + 60_000 };
      windows.set(key, window);
    }
    if (++window.count > 10) {
      ctx.header('Retry-After', String(Math.ceil((window.resetAt - now) / 1000)));
      throw AppError.tooManyRequests('Trop de signalements');
    }
    await next();
  },
  handleBrowserIncident,
);
