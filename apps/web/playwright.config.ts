import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour les tests E2E SportCoach IA
 * Docs: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Timeout par test — OWASP A10: s'assurer que les tests ne tournent pas indéfiniment
  timeout: 30_000,
  expect: { timeout: 5_000 },
  // Reporter lisible en CI
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  // Paramètres partagés entre tous les tests
  use: {
    baseURL: 'http://localhost:3000',
    // RGAA 4.1: tester avec un viewport standard
    viewport: { width: 1280, height: 720 },
    // Trace en cas d'échec pour diagnostic
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Test accessibilité sur Firefox également
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  // Démarrage automatique du serveur Next.js pour les tests locaux
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
