import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { handleDeleteAccount, handleExportAccount } from '../controllers/account.controller.js';

export const accountRouter = new Hono();
accountRouter.use('*', authMiddleware);
accountRouter.get('/export', handleExportAccount);
accountRouter.delete('/', handleDeleteAccount);
