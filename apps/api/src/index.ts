// Charger les variables d'environnement en premier (avant tout autre import)
import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';
import { handleError } from './middleware/error.middleware.js';
import { registerRoutes } from './routes/index.js';
import { pool } from './db/index.js';

const app = new Hono();

const port = Number(process.env['PORT'] ?? 3001);
const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3000';

// OWASP A05: headers de sécurité (secureHeaders)
app.use('*', secureHeaders());

// OWASP A05: CORS restrictif — uniquement le frontend autorisé
app.use(
  '*',
  cors({
    origin: frontendUrl,
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-session-token'],
    credentials: true,
    maxAge: 86_400,
  }),
);

// OWASP A09: logging structuré
app.use('*', logger());

// Handler d'erreurs centralisé — API idiomatique Hono (architecture.md)
app.onError(handleError);

// Enregistrement des routes
registerRoutes(app);

// Route 404 par défaut
app.notFound((ctx) => {
  return ctx.json(
    {
      error: 'NOT_FOUND',
      message: 'Route introuvable',
      statusCode: 404,
    },
    404,
  );
});

// Démarrage du serveur
serve({ fetch: app.fetch, port }, (info) => {
  console.info(`[API] SportCoach IA démarré sur http://localhost:${info.port}`);
});

// Fermeture propre (graceful shutdown)
process.on('SIGTERM', async () => {
  console.info('[API] Arrêt du serveur...');
  await pool.end();
  process.exit(0);
});
