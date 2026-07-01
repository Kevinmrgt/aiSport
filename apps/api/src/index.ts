import { serve } from '@hono/node-server';
import { app } from './app.js';
import { pool } from './db/index.js';

const port = Number(process.env['PORT'] ?? 3001);

// Démarrage du serveur (dev local et Docker uniquement — pas utilisé sur Vercel)
serve({ fetch: app.fetch, port }, (info) => {
  console.info(`[API] Alcide démarré sur http://localhost:${info.port}`);
});

// Fermeture propre (graceful shutdown)
process.on('SIGTERM', () => {
  console.info('[API] Arrêt du serveur...');
  void pool.end().then(() => process.exit(0));
});
