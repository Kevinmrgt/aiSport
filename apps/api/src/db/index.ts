import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

// OWASP A02: connexion via variable d'env uniquement, jamais hardcodée
const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL est requise');
}

const pool = new Pool({
  connectionString: databaseUrl,
  // Serverless-optimisé : peu de connexions, expiration rapide
  max: 3,
  idleTimeoutMillis: 5_000,
  connectionTimeoutMillis: 5_000,
  // Critique pour Vercel : permet au process Node.js de s'arrêter
  // quand toutes les connexions sont idle (évite le hang de la lambda)
  allowExitOnIdle: true,
});

export const db = drizzle(pool, { schema });

// Export du pool pour fermeture propre au shutdown
export { pool };
