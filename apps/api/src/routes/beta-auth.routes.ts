import { Hono } from 'hono';
import { handleAuthorizeBeta, handleChangeOwnBetaPassword } from '../controllers/beta-auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { credentialRateLimitMiddleware } from '../middleware/credential-rate-limit.middleware.js';
import { internalSecretMiddleware } from '../middleware/internal-secret.middleware.js';

const betaAuthRouter = new Hono();
betaAuthRouter.post('/authorize', internalSecretMiddleware, credentialRateLimitMiddleware, handleAuthorizeBeta);
betaAuthRouter.put('/password', authMiddleware, handleChangeOwnBetaPassword);

export { betaAuthRouter };
