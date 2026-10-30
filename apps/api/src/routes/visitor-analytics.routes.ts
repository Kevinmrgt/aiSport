import { Hono } from 'hono';
import { handleRecordPageVisit } from '../controllers/visitor-analytics.controller.js';
import { internalSecretMiddleware } from '../middleware/internal-secret.middleware.js';

const visitorAnalyticsRouter = new Hono();

// Seul le route handler Next.js peut enregistrer une visite : le secret de
// service ne transite jamais dans le navigateur.
visitorAnalyticsRouter.use('*', internalSecretMiddleware);
visitorAnalyticsRouter.post('/visits', handleRecordPageVisit);

export { visitorAnalyticsRouter };
