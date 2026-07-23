import { defineConfig, devices } from '@playwright/test';
import { createJuryPasswordHash } from './lib/jury-auth';

const juryTestPassword = 'jury-playwright-password-2026';
const juryTestIdentifier = 'jury-playwright';

/**
 * Configuration Playwright pour les tests E2E Alcide
 * Docs: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Timeout par test — OWASP A10: s'assurer que les tests ne tournent pas indéfiniment
  timeout: 30_000,
  expect: { timeout: 10_000 },
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
    // pnpm est fourni par pnpm/action-setup en CI et par le runtime local.
    // Ne pas imposer Corepack : certains environnements Node minimaux ne
    // livrent pas son exécutable alors que pnpm est déjà disponible.
    command: 'pnpm dev',
    env: {
      ...process.env,
      AUTH_SECRET: process.env['AUTH_SECRET'] ?? 'test-auth-secret-for-playwright-32chars',
      AUTH_GOOGLE_ID: process.env['AUTH_GOOGLE_ID'] ?? 'test-google-client-id',
      AUTH_GOOGLE_SECRET: process.env['AUTH_GOOGLE_SECRET'] ?? 'test-google-client-secret',
      NEXTAUTH_URL: process.env['NEXTAUTH_URL'] ?? 'http://localhost:3000',
      NEXT_PUBLIC_API_URL: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001',
      SERVICE_SECRET: process.env['SERVICE_SECRET'] ?? 'test-service-secret-for-playwright',
      PLAYWRIGHT_AUTH_STORAGE: process.env['PLAYWRIGHT_AUTH_STORAGE'] ?? '',
      JURY_ACCESS_ENABLED: 'true',
      JURY_ACCESS_IDENTIFIER: juryTestIdentifier,
      JURY_ACCESS_PASSWORD_HASH: createJuryPasswordHash(
        juryTestPassword,
        Buffer.from('playwright-jury!'),
      ),
      JURY_ACCESS_USER_ID: 'jury-playwright-user',
      JURY_ACCESS_EMAIL: 'jury-playwright@alcide.invalid',
      JURY_ACCESS_NAME: 'Jury Playwright',
      JURY_ACCESS_EXPIRES_AT: '2099-12-31T23:59:59.000Z',
      JURY_ACCESS_SESSION_VERSION: 'playwright-session-v1',
      E2E_JURY_IDENTIFIER: juryTestIdentifier,
      E2E_JURY_PASSWORD: juryTestPassword,
    },
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
