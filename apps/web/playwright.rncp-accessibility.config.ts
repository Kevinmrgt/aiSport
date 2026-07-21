import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const baseURL = process.env['E2E_BASE_URL'] ?? 'https://ai-sport-web.vercel.app';
const storageState = resolve(
  process.cwd(),
  process.env['PLAYWRIGHT_AUTH_STORAGE'] ?? 'playwright/.auth/google-e2e.json',
);

process.env['PLAYWRIGHT_AUTH_STORAGE'] = storageState;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'rncp-accessibility-final.spec.ts',
  timeout: 45_000,
  expect: { timeout: 12_000 },
  workers: 1,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    viewport: { width: 1280, height: 720 },
    // Les traces et captures peuvent contenir des donnees de session.
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [{ name: 'rncp-accessibility-chromium' }],
});
