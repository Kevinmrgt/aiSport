import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/repositories.integration.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage/integration',
      include: [
        'src/repositories/**/*.ts',
        'src/services/session-log.service.ts',
      ],
      // Seuils fixes apres la mesure PostgreSQL reelle du 2026-07-20
      // (93,69 % lignes/statements, 80 % branches, 100 % fonctions).
      // Ils protegent une couverture majoritaire sans reutiliser les chiffres
      // du rapport unitaire, dont le perimetre est different.
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 90,
        lines: 80,
      },
    },
  },
});
