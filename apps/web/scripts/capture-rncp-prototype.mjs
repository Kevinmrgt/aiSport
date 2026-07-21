import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const baseURL = process.env.E2E_BASE_URL ?? 'https://ai-sport-web.vercel.app';
const storageState = resolve(
  process.cwd(),
  process.env.PLAYWRIGHT_AUTH_STORAGE ?? 'playwright/.auth/google-e2e.json',
);
const outputDirectory = resolve(
  process.cwd(),
  '../../docs/rncp/bloc2-annexes/screenshots/final-2026-07-21',
);

if (!existsSync(storageState)) {
  throw new Error(`Session Playwright introuvable : ${storageState}`);
}

mkdirSync(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newContext({
    storageState,
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const desktopPage = await desktop.newPage();

  await desktopPage.goto(`${baseURL}/generate`, { waitUntil: 'networkidle' });
  await desktopPage.getByRole('form', { name: 'Construire le training' }).waitFor();
  await desktopPage.locator('main').screenshot({
    path: resolve(outputDirectory, 'B2-A30-generation-seance-desktop-2026-07-21.png'),
  });

  await desktopPage.goto(`${baseURL}/programs/generate`, { waitUntil: 'networkidle' });
  await desktopPage.locator('main').screenshot({
    path: resolve(outputDirectory, 'B2-A30-generation-programme-desktop-2026-07-21.png'),
  });
  await desktop.close();

  const mobile = await browser.newContext({
    storageState,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(`${baseURL}/generate`, { waitUntil: 'networkidle' });
  await mobilePage.getByRole('form', { name: 'Construire le training' }).waitFor();

  const dimensions = await mobilePage.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
  }));
  if (dimensions.contentWidth > dimensions.viewportWidth) {
    throw new Error(
      `Débordement horizontal : contenu ${dimensions.contentWidth}px, viewport ${dimensions.viewportWidth}px.`,
    );
  }

  await mobilePage.locator('main').screenshot({
    path: resolve(outputDirectory, 'B2-A30-generation-seance-mobile-2026-07-21.png'),
  });
  await mobile.close();

  console.log(`Captures écrites dans ${outputDirectory}`);
} finally {
  await browser.close();
}
