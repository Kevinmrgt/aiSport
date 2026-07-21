import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { assertPathInside, restrictPathToCurrentUser } from './e2e-auth-security.mjs';
import { filterStateForOrigin, hasAuthSessionCookie } from './e2e-auth-state.mjs';

const webRoot = process.cwd();
const authRoot = resolve(webRoot, 'playwright/.auth');
const profilePath = join(authRoot, 'chrome-profile');
const metadataPath = join(authRoot, 'chrome-capture.json');
const storagePath = resolve(
  webRoot,
  process.env.PLAYWRIGHT_AUTH_STORAGE || 'playwright/.auth/google-e2e.json',
);
const expectedEmail = process.env.E2E_AUTH_EMAIL?.trim().toLowerCase();
const baseURL = process.env.E2E_BASE_URL || 'https://ai-sport-web.vercel.app';

function fail(message) {
  throw new Error(`[E2E auth] ${message}`);
}

async function removeTemporaryProfile(profilePath) {
  assertPathInside(authRoot, profilePath);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      rmSync(profilePath, { recursive: true, force: true });
      rmSync(metadataPath, { force: true });
      return;
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 250));
    }
  }

  fail(`Impossible de supprimer le profil Chrome temporaire : ${profilePath}`);
}

let browser;
let captureSucceeded = false;

try {
  if (!expectedEmail) fail('E2E_AUTH_EMAIL est obligatoire.');
  if (!existsSync(metadataPath)) {
    fail('Navigateur dédié absent. Lancez d’abord « pnpm test:e2e:auth:browser ».');
  }

  const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
  if (resolve(metadata.profilePath) !== profilePath) {
    fail('Le profil indiqué par les métadonnées est invalide.');
  }

  browser = await chromium.connectOverCDP(metadata.endpoint);
  if (
    metadata.expectedEmail !== expectedEmail ||
    new URL(metadata.baseURL).origin !== new URL(baseURL).origin
  ) {
    fail('Les paramètres de capture diffèrent de ceux utilisés pour lancer Google Chrome.');
  }

  const contexts = browser.contexts();
  if (contexts.length !== 1) fail('Le profil Chrome dédié doit contenir un seul contexte.');

  const context = contexts[0];
  const sessionURL = new URL('/api/auth/session', baseURL).toString();
  const response = await context.request.get(sessionURL);
  if (!response.ok()) fail('La session Auth.js est illisible.');

  const session = await response.json();
  const authenticatedEmail = session.user?.email?.trim().toLowerCase();
  if (authenticatedEmail !== expectedEmail) {
    fail(
      `Compte incorrect (${authenticatedEmail || 'aucune session'}). ` +
        'Aucun cookie ne sera enregistré.',
    );
  }

  const state = await context.storageState();
  const filteredState = filterStateForOrigin(state, baseURL);
  if (!hasAuthSessionCookie(filteredState)) {
    fail('Aucun cookie de session Auth.js propre à Alcide n’a été trouvé.');
  }

  mkdirSync(dirname(storagePath), { recursive: true });
  writeFileSync(storagePath, JSON.stringify(filteredState, null, 2), {
    encoding: 'utf8',
    mode: 0o600,
  });
  restrictPathToCurrentUser(storagePath);
  captureSucceeded = true;
  console.info(`[E2E auth] Session Alcide dédiée enregistrée hors Git : ${storagePath}`);
  console.info('[E2E auth] Aucun cookie Google n’a été conservé.');
} finally {
  if (browser) await browser.close().catch(() => undefined);
  await removeTemporaryProfile(profilePath);
}

if (!captureSucceeded) process.exit(1);
