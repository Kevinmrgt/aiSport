import { defineConfig } from 'drizzle-kit';
import { normalizeDatabaseUrl } from './src/db/database-url';

const databaseUrl = process.env['DATABASE_URL'];

export default defineConfig({
  schema: [
    './src/db/schema.ts',
    './src/db/generation-budget.schema.ts',
    './src/db/privacy.schema.ts',
    './src/db/session-operation.schema.ts',
  ],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // OWASP A02: connexion via variable d'env
    url: databaseUrl ? normalizeDatabaseUrl(databaseUrl) : '',
  },
  verbose: true,
  strict: true,
});
