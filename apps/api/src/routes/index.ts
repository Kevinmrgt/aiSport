import type { Hono } from 'hono';
import { healthRouter } from './health.routes.js';
import { workoutRouter } from './workout.routes.js';
import { programRouter } from './program.routes.js';
import { settingsRouter } from './settings.routes.js';
import { sessionLogRouter } from './session-log.routes.js';

// Registre central de toutes les routes (architecture.md)
export function registerRoutes(app: Hono): void {
  app.route('/health', healthRouter);
  app.route('/workouts', workoutRouter);
  app.route('/programs', programRouter);
  app.route('/settings', settingsRouter);
  app.route('/session-logs', sessionLogRouter);
}
