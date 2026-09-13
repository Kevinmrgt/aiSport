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
  handleGetPlatformSettings,
} from '../controllers/admin-beta.controller.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { handleAdminSummary, handleAdminAnalytics, handleAdminMembers, handleAdminMember, handleAdminSubscriptions, handleAdminCredits, handleAdminAudit, handleAdminContents, handleAdminContent, handleAdminSuspension, handleAdminGrant } from '../controllers/admin.controller.js';

const adminBetaRouter = new Hono();
adminBetaRouter.use('*', authMiddleware, adminMiddleware);
adminBetaRouter.use('*', async (ctx, next) => { ctx.header('Cache-Control', 'no-store'); await next(); });
adminBetaRouter.get('/summary', handleAdminSummary);
adminBetaRouter.get('/analytics', handleAdminAnalytics);
adminBetaRouter.get('/members', handleAdminMembers);
adminBetaRouter.get('/members/:id', handleAdminMember);
adminBetaRouter.patch('/members/:id/suspension', handleAdminSuspension);
adminBetaRouter.post('/members/:id/credits', handleAdminGrant);
adminBetaRouter.get('/subscriptions', handleAdminSubscriptions);
adminBetaRouter.get('/credits', handleAdminCredits);
adminBetaRouter.get('/audit', handleAdminAudit);
adminBetaRouter.get('/workouts', handleAdminContents('workouts'));
adminBetaRouter.get('/workouts/:id', handleAdminContent('workouts'));
adminBetaRouter.get('/programs', handleAdminContents('programs'));
adminBetaRouter.get('/programs/:id', handleAdminContent('programs'));
adminBetaRouter.get('/platform-settings', handleGetPlatformSettings);
adminBetaRouter.get('/overview', handleGetAdminOverview);
adminBetaRouter.put('/platform-settings', handleSavePlatformSettings);
adminBetaRouter.get('/beta-testers', handleListBetaTesters);
adminBetaRouter.post('/beta-testers', handleCreateBetaTester);
adminBetaRouter.post('/beta-testers/:userId/credits', handleAdjustBetaBalance);
adminBetaRouter.patch('/beta-testers/:userId/status', handleSetBetaStatus);
adminBetaRouter.post('/beta-testers/:userId/password-reset', handleResetBetaPassword);
adminBetaRouter.delete('/beta-testers/:userId', handleDeleteBetaTester);

export { adminBetaRouter };
