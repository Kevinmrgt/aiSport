import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';
import { assertPathInside, restrictPathToCurrentUser } from './e2e-auth-security.mjs';

const webRoot = process.cwd();
const authRoot = resolve(webRoot, 'playwright/.auth');
const profilePath = join(authRoot, 'chrome-profile');
const metadataPath = join(authRoot, 'chrome-capture.json');
const baseURL = process.env.E2E_BASE_URL || 'https://ai-sport-web.vercel.app';
const expectedEmail = process.env.E2E_AUTH_EMAIL?.trim().toLowerCase();

function fail(message) {
  throw new Error(`[E2E auth] ${message}`);
}

function findChrome() {
  const candidates = [
    process.env.E2E_CHROME_PATH,
    process.env.LOCALAPPDATA
      ? join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe')
      : undefined,
    process.env.ProgramFiles
      ? join(process.env.ProgramFiles, 'Google/Chrome/Application/chrome.exe')
      : undefined,
    process.env['ProgramFiles(x86)']
      ? join(process.env['ProgramFiles(x86)'], 'Google/Chrome/Application/chrome.exe')
      : undefined,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ].filter(Boolean);

  const chromePath = candidates.find((candidate) => existsSync(candidate));
  if (!chromePath) {
    fail('Google Chrome est introuvable. Définissez E2E_CHROME_PATH vers son exécutable.');
  }
  return chromePath;
}

async function reservePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Port CDP indisponible'));
        return;
      }
      server.close(() => resolvePort(address.port));
    });
  });
}

async function waitForChrome(endpoint) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${endpoint}/json/version`);
      if (response.ok) return;
    } catch {
      // Chrome démarre encore.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  fail('Google Chrome n’a pas exposé le port de capture dans le délai prévu.');
}

async function waitForChildExit(child, timeoutMs) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return true;

  return new Promise((resolveExit) => {
    const onExit = () => {
      clearTimeout(timeout);
      resolveExit(true);
    };
    const timeout = setTimeout(() => {
      child.off('exit', onExit);
      resolveExit(false);
    }, timeoutMs);
    child.once('exit', onExit);
  });
}

async function removeLaunchArtifacts() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      rmSync(profilePath, { recursive: true, force: true });
      rmSync(metadataPath, { force: true });
      return;
    } catch (error) {
      if (attempt === 19) throw error;
      await new Promise((resolveWait) => setTimeout(resolveWait, 250));
    }
  }
}

async function main() {
  if (!expectedEmail) fail('E2E_AUTH_EMAIL est obligatoire.');

  assertPathInside(authRoot, profilePath);
  assertPathInside(authRoot, metadataPath);
  mkdirSync(authRoot, { recursive: true });
  restrictPathToCurrentUser(authRoot, { directory: true });

  // Le profil est exclusivement temporaire et ne doit jamais reprendre une session précédente.
  rmSync(profilePath, { recursive: true, force: true });
  rmSync(metadataPath, { force: true });
  mkdirSync(profilePath, { recursive: true });

  let child;
  try {
    const port = await reservePort();
    const endpoint = `http://127.0.0.1:${port}`;
    const chromePath = findChrome();
    const loginURL = new URL('/login', baseURL).toString();
    child = spawn(
      chromePath,
      [
        `--remote-debugging-port=${port}`,
        '--remote-debugging-address=127.0.0.1',
        `--user-data-dir=${profilePath}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-sync',
        loginURL,
      ],
      { detached: true, stdio: 'ignore', windowsHide: false },
    );

    child.unref();
    writeFileSync(
      metadataPath,
      JSON.stringify(
        {
          baseURL,
          endpoint,
          expectedEmail,
          profilePath,
          startedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      { encoding: 'utf8', mode: 0o600 },
    );
    restrictPathToCurrentUser(metadataPath);

    await Promise.race([
      waitForChrome(endpoint),
      new Promise((_, reject) => {
        child.once('error', reject);
        child.once('exit', (code) => reject(new Error(`Google Chrome s’est arrêté (${code}).`)));
      }),
    ]);
    console.info('[E2E auth] Google Chrome isolé ouvert pour le compte de test configuré.');
    console.info('[E2E auth] Connectez-vous avec Google puis attendez le retour sur /generate.');
    console.info('[E2E auth] Ensuite lancez : pnpm test:e2e:auth:capture');
  } catch (error) {
    if (child?.pid && child.exitCode === null) {
      try {
        child.kill('SIGTERM');
      } catch {
        // Le processus vient de s’arrêter entre le contrôle et le signal.
      }
      const exited = await waitForChildExit(child, 5_000);
      if (!exited) {
        try {
          child.kill('SIGKILL');
        } catch {
          // Le processus vient de s’arrêter avant le second signal.
        }
        await waitForChildExit(child, 2_000);
      }
    }
    await removeLaunchArtifacts();
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
