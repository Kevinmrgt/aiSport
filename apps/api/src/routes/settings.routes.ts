import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  handleGetSettings,
  handleSaveSettings,
} from '../controllers/settings.controller.js';

const settingsRouter = new Hono();

// OWASP A01: toutes les routes settings necessitent une session valide
settingsRouter.use('*', authMiddleware);

// GET /settings - lire les parametres IA de l'utilisateur
settingsRouter.get('/', handleGetSettings);

// PUT /settings - enregistrer le modele OpenAI choisi
settingsRouter.put('/', handleSaveSettings);

export { settingsRouter };
