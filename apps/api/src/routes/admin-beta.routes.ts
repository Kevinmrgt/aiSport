import { Hono } from 'hono';
import {
  handleAdjustBetaBalance,
  handleCreateBetaTester,
  handleDeleteBetaTester,
  handleGetAdminOverview,
  handleListBetaTesters,
  handleResetBetaPassword,
  handleSavePlatformSettings,
  handleSetBetaStatus,
} from '../controllers/admin-beta.controller.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const adminBetaRouter = new Hono();
adminBetaRouter.use('*', authMiddleware, adminMiddleware);
adminBetaRouter.get('/overview', handleGetAdminOverview);
adminBetaRouter.put('/platform-settings', handleSavePlatformSettings);
adminBetaRouter.get('/beta-testers', handleListBetaTesters);
adminBetaRouter.post('/beta-testers', handleCreateBetaTester);
adminBetaRouter.post('/beta-testers/:userId/credits', handleAdjustBetaBalance);
adminBetaRouter.patch('/beta-testers/:userId/status', handleSetBetaStatus);
adminBetaRouter.post('/beta-testers/:userId/password-reset', handleResetBetaPassword);
adminBetaRouter.delete('/beta-testers/:userId', handleDeleteBetaTester);

export { adminBetaRouter };
