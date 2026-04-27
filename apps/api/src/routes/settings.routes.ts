import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  handleGetSettings,
  handleSaveSettings,
  handleDeleteApiKey,
} from '../controllers/settings.controller.js';

const settingsRouter = new Hono();

// OWASP A01: toutes les routes settings nécessitent une session valide
settingsRouter.use('*', authMiddleware);

// GET /settings — lire les paramètres IA de l'utilisateur
settingsRouter.get('/', handleGetSettings);

// PUT /settings — enregistrer les paramètres IA
settingsRouter.put('/', handleSaveSettings);

// DELETE /settings/api-key — supprimer la clé API personnelle
settingsRouter.delete('/api-key', handleDeleteApiKey);

export { settingsRouter };
