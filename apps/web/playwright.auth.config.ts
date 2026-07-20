import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const baseURL = process.env['E2E_BASE_URL'] ?? 'https://ai-sport-web.vercel.app';
const storagePath = resolve(
  process.cwd(),
  process.env['PLAYWRIGHT_AUTH_STORAGE'] ?? 'playwright/.auth/google-e2e.json',
);
const isLocal = new URL(baseURL).hostname === 'localhost';

process.env['PLAYWRIGHT_AUTH_STORAGE'] = storagePath;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'generate.spec.ts',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-authenticated', open: 'never' }],
  ],
  workers: 1,
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    storageState: storagePath,
    viewport: { width: 1280, height: 720 },
    // Une trace peut contenir des en-têtes/cookies. Elle reste désactivée pour cette suite.
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'authenticated-chromium' }],
  webServer: isLocal
    ? {
        command: 'pnpm --dir ../.. dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
