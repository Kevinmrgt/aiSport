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
  // Limiter les connexions pour éviter les surcharges
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

export const db = drizzle(pool, { schema });

// Export du pool pour fermeture propre au shutdown
export { pool };
