import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      // Cible >70% (testing.md — compétence ÉLIMINATOIRE RNCP)
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/db/**'],
    },
  },
  resolve: {
    alias: {
      '@api': '/src',
    },
  },
});
