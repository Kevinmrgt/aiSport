import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // OWASP A02: connexion via variable d'env
    url: process.env['DATABASE_URL'] ?? '',
  },
  verbose: true,
  strict: true,
});
