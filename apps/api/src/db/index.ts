import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';
import * as generationSchema from './generation-budget.schema.js';
import * as privacySchema from './privacy.schema.js';
import * as sessionOperationSchema from './session-operation.schema.js';
import * as pilotSchema from './pilot.schema.js';
import { resolveDatabaseUrl } from './database-url.js';

// OWASP A02: connexion via variable d'env uniquement, jamais hardcodée
const pool = new Pool({
  connectionString: resolveDatabaseUrl(),
  // Serverless-optimisé : peu de connexions, expiration rapide
  max: 3,
  idleTimeoutMillis: 5_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 10_000,
  query_timeout: 12_000,
  // Critique pour Vercel : permet au process Node.js de s'arrêter
  // quand toutes les connexions sont idle (évite le hang de la lambda)
  allowExitOnIdle: true,
});

export const db = drizzle(pool, {
  schema: {
    ...schema,
    ...generationSchema,
    ...privacySchema,
    ...sessionOperationSchema,
    ...pilotSchema,
  },
});

// Export du pool pour fermeture propre au shutdown
export { pool };
