import { Hono } from 'hono';
import { handleGetGenerationQuota } from '../controllers/generation-quota.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const generationQuotaRouter = new Hono();

generationQuotaRouter.use('*', authMiddleware);
generationQuotaRouter.get('/', handleGetGenerationQuota);

export { generationQuotaRouter };
