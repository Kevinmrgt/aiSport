import { Hono } from 'hono';
import { handleGetGenerationQuota } from '../controllers/generation-quota.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { betaPasswordChangedMiddleware } from '../middleware/beta-password.middleware.js';

const generationQuotaRouter = new Hono();

generationQuotaRouter.use('*', authMiddleware);
generationQuotaRouter.use('*', betaPasswordChangedMiddleware);
generationQuotaRouter.get('/', handleGetGenerationQuota);

export { generationQuotaRouter };
