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
  testMatch: 'auth.capture.spec.ts',
  timeout: 5 * 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  workers: 1,
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'capture-google-session' }],
  webServer: isLocal
    ? {
        command: 'pnpm dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
