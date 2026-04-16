import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware.js';
import {
  handleGenerateWorkout,
  handleGetWorkouts,
  handleGetWorkout,
  handleDeleteWorkout,
  handleGetStats,
} from '../controllers/workout.controller.js';

const workoutRouter = new Hono();

// OWASP A01: toutes les routes workout nécessitent une session valide
workoutRouter.use('*', authMiddleware);

// POST /workouts/generate — OWASP A04: rate limit 5 req/min par utilisateur
workoutRouter.post('/generate', rateLimitMiddleware, handleGenerateWorkout);

// GET /workouts — liste des entraînements de l'utilisateur connecté
workoutRouter.get('/', handleGetWorkouts);

// GET /workouts/stats — statistiques de l'utilisateur (avant /:id pour éviter le conflit)
workoutRouter.get('/stats', handleGetStats);

// GET /workouts/:id — détail d'un entraînement (avec vérification ownership)
workoutRouter.get('/:id', handleGetWorkout);

// DELETE /workouts/:id — supprimer un entraînement (avec vérification ownership)
workoutRouter.delete('/:id', handleDeleteWorkout);

export { workoutRouter };
