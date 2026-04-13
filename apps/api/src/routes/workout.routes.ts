import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  handleGenerateWorkout,
  handleGetWorkouts,
  handleGetWorkout,
  handleDeleteWorkout,
} from '../controllers/workout.controller.js';

const workoutRouter = new Hono();

// OWASP A01: toutes les routes workout nécessitent une session valide
workoutRouter.use('*', authMiddleware);

// POST /workouts/generate — générer un entraînement via Mistral AI
workoutRouter.post('/generate', handleGenerateWorkout);

// GET /workouts — liste des entraînements de l'utilisateur connecté
workoutRouter.get('/', handleGetWorkouts);

// GET /workouts/:id — détail d'un entraînement (avec vérification ownership)
workoutRouter.get('/:id', handleGetWorkout);

// DELETE /workouts/:id — supprimer un entraînement (avec vérification ownership)
workoutRouter.delete('/:id', handleDeleteWorkout);

export { workoutRouter };
