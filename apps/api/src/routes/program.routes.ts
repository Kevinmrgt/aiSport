import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware.js';
import {
  handleGenerateProgram,
  handleGetPrograms,
  handleGetProgram,
  handleDeleteProgram,
} from '../controllers/program.controller.js';

const programRouter = new Hono();

// OWASP A01: toutes les routes programme nécessitent une session valide
programRouter.use('*', authMiddleware);

// POST /programs/generate — OWASP A04: rate limit (même politique que /workouts/generate)
programRouter.post('/generate', rateLimitMiddleware, handleGenerateProgram);

// GET /programs — liste des programmes de l'utilisateur connecté
programRouter.get('/', handleGetPrograms);

// GET /programs/:id — détail d'un programme (avec vérification ownership)
programRouter.get('/:id', handleGetProgram);

// DELETE /programs/:id — supprimer un programme (avec vérification ownership)
programRouter.delete('/:id', handleDeleteProgram);

export { programRouter };
