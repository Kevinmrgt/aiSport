import type { Hono } from 'hono';
import { healthRouter } from './health.routes.js';
import { workoutRouter } from './workout.routes.js';

// Registre central de toutes les routes (architecture.md)
export function registerRoutes(app: Hono): void {
  app.route('/health', healthRouter);
  app.route('/workouts', workoutRouter);
}
