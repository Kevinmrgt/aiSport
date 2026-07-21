import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const baseURL = process.env['E2E_BASE_URL'] ?? 'https://ai-sport-web.vercel.app';
const storagePath = resolve(
  process.cwd(),
  process.env['PLAYWRIGHT_AUTH_STORAGE'] ?? 'playwright/.auth/google-e2e.json',
);

process.env['PLAYWRIGHT_AUTH_STORAGE'] = storagePath;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'rncp-recipes-final.spec.ts',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  workers: 1,
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    storageState: storagePath,
    viewport: { width: 1280, height: 720 },
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'authenticated-chromium' }],
});
