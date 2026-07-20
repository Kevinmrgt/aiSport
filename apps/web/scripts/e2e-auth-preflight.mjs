import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

const mode = process.argv[2];
const webRoot = process.cwd();
const defaultStorage = resolve(webRoot, 'playwright/.auth/google-e2e.json');
const storagePath = resolve(webRoot, process.env.PLAYWRIGHT_AUTH_STORAGE || defaultStorage);
const expectedEmail = process.env.E2E_AUTH_EMAIL?.trim().toLowerCase();
const baseUrl = process.env.E2E_BASE_URL || 'https://ai-sport-web.vercel.app';

function fail(message) {
  console.error(`[E2E auth] ${message}`);
  process.exit(1);
}

if (!['capture', 'run'].includes(mode)) {
  fail('Mode attendu : capture ou run.');
}

if (!expectedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(expectedEmail)) {
  fail('E2E_AUTH_EMAIL doit contenir l’adresse du compte Google de test dédié.');
}

let parsedBaseUrl;
try {
  parsedBaseUrl = new URL(baseUrl);
} catch {
  fail('E2E_BASE_URL doit être une URL absolue.');
}

if (parsedBaseUrl.protocol !== 'https:' && parsedBaseUrl.hostname !== 'localhost') {
  fail('E2E_BASE_URL doit utiliser HTTPS, sauf pour localhost.');
}

let repositoryRoot;
try {
  repositoryRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: webRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
} catch {
  fail('Le dépôt Git est introuvable.');
}

const relativeStorage = relative(repositoryRoot, storagePath);
const storageIsInsideRepository =
  relativeStorage !== '' && !relativeStorage.startsWith('..') && !isAbsolute(relativeStorage);

if (storageIsInsideRepository) {
  try {
    execFileSync('git', ['check-ignore', '-q', '--', relativeStorage], {
      cwd: repositoryRoot,
      stdio: 'ignore',
    });
  } catch {
    fail(`Le storageState n’est pas ignoré par Git : ${relativeStorage}`);
  }

  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '--', relativeStorage], {
      cwd: repositoryRoot,
      stdio: 'ignore',
    });
    fail(`Le storageState est déjà suivi par Git : ${relativeStorage}`);
  } catch (error) {
    if (error?.status === 1) {
      // Statut attendu : le fichier n’est pas suivi.
    } else if (error?.status !== undefined) {
      throw error;
    }
  }
}

if (mode === 'run' && !existsSync(storagePath)) {
  fail(
    `Aucune session dédiée trouvée. Lancez d’abord « pnpm test:e2e:auth:capture » (${storagePath}).`,
  );
}

process.env.PLAYWRIGHT_AUTH_STORAGE = storagePath;
console.info(`[E2E auth] Politique validée pour ${expectedEmail} sur ${parsedBaseUrl.origin}.`);
console.info(`[E2E auth] storageState hors suivi Git : ${storagePath}`);
