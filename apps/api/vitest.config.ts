import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    exclude: ['tests/**/*.integration.test.ts', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      // Rapport unitaire uniquement. Ce pourcentage ne doit pas etre presente
      // comme la couverture globale du monorepo ni des acces PostgreSQL.
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts',
        // Assemblage de demarrage, mesure separement par les tests HTTP/E2E.
        'src/app.ts',
        'src/db/**',
        // Les repositories ont leur propre rapport avec une vraie base PostgreSQL
        // (vitest.integration.config.ts). Les routes declaratives sont couvertes
        // fonctionnellement par les tests HTTP des controleurs et les E2E.
        'src/repositories/**',
        'src/routes/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@api': '/src',
    },
  },
});
