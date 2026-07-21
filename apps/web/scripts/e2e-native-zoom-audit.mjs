import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '../../..');
const baseURL = process.env.E2E_BASE_URL ?? 'https://ai-sport-web.vercel.app';
const storagePath = resolve(
  process.cwd(),
  process.env.PLAYWRIGHT_AUTH_STORAGE ?? 'playwright/.auth/google-e2e.json',
);
const extensionPath = resolve(
  scriptDirectory,
  '../tests/e2e/fixtures/native-zoom-extension',
);
const evidenceDirectory = resolve(repositoryRoot, 'tmp/accessibility-final/native-zoom');
const userDataDirectory = mkdtempSync(join(tmpdir(), 'alcide-native-zoom-'));

const publicRoutes = ['/', '/login', '/confidentialite'];
const privateRoutes = ['/dashboard', '/generate', '/programs', '/workouts', '/settings'];
const sessionCookieNames = ['authjs.session-token', '__Secure-authjs.session-token'];
const publicOnly = process.env.RNCP_ZOOM_SCOPE === 'public';
const correctivePreview = process.env.RNCP_ZOOM_WRAP_FIX_PREVIEW === '1';
const auditedRoutes = publicOnly ? publicRoutes : [...publicRoutes, ...privateRoutes];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function loadStorageState() {
  invariant(existsSync(storagePath), `Session OAuth locale absente : ${storagePath}`);
  const state = JSON.parse(readFileSync(storagePath, 'utf8'));
  const hasSessionCookie = state.cookies?.some(
    (cookie) =>
      Boolean(cookie.value) &&
      sessionCookieNames.some(
        (name) => cookie.name === name || cookie.name?.startsWith(`${name}.`),
      ),
  );
  invariant(hasSessionCookie, 'La session locale ne contient pas de cookie Auth.js valide.');
  return state;
}

function cookiesForTarget(cookies) {
  const target = new URL(baseURL);
  if (target.protocol === 'https:') return cookies;
  invariant(
    ['localhost', '127.0.0.1'].includes(target.hostname),
    'La réécriture locale des cookies est interdite hors localhost.',
  );
  return cookies.map(({ domain: _domain, path: _path, secure: _secure, ...cookie }) => ({
    ...cookie,
    name: cookie.name.replace(/^__(?:Secure|Host)-/, ''),
    url: `${target.origin}/`,
    secure: false,
  }));
}

async function waitForExtensionWorker(context) {
  const existing = context.serviceWorkers()[0];
  return existing ?? context.waitForEvent('serviceworker', { timeout: 15_000 });
}

async function setNativeZoom(worker, page, factor) {
  const url = page.url();
  const actual = await worker.evaluate(
    async ({ currentUrl, requestedFactor }) => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find(({ url }) => url === currentUrl);
      if (!tab?.id) throw new Error(`Onglet Chromium introuvable pour ${currentUrl}`);
      await chrome.tabs.setZoom(tab.id, requestedFactor);
      return chrome.tabs.getZoom(tab.id);
    },
    { currentUrl: url, requestedFactor: factor },
  );
  await page.waitForTimeout(400);
  invariant(Math.abs(actual - factor) < 0.01, `Zoom demandé ${factor}, obtenu ${actual}`);
  return actual;
}

async function measure(page, route, factor, baselineWidth) {
  const values = await page.evaluate(() => ({
    devicePixelRatio: window.devicePixelRatio,
    innerWidth: window.innerWidth,
    visualViewportWidth: window.visualViewport?.width ?? null,
    clientWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    mainVisible: Boolean(document.querySelector('main#main-content')?.getClientRects().length),
    headingVisible: Boolean(document.querySelector('h1')?.getClientRects().length),
    clippedElements: [...document.querySelectorAll('h1, h2, h3, p, a, button, input, select, textarea, label')]
      .filter((element) => element instanceof HTMLElement && element.getClientRects().length > 0)
      .filter((element) => !(element.clientWidth <= 1 && element.clientHeight <= 1))
      .flatMap((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const outsideViewport = rect.left < -1 || rect.right > document.documentElement.clientWidth + 1;
        const internallyClipped =
          element.scrollWidth > element.clientWidth + 1 &&
          ['hidden', 'clip'].includes(style.overflowX);
        if (!outsideViewport && !internallyClipped) return [];
        return [
          {
            tag: element.tagName.toLowerCase(),
            text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80) ?? '',
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            overflowX: style.overflowX,
          },
        ];
      })
      .slice(0, 20),
  }));

  const expectedWidth = baselineWidth / factor;
  invariant(values.mainVisible, `${route} : contenu principal invisible à ${factor * 100} %.`);
  invariant(values.headingVisible, `${route} : titre principal invisible à ${factor * 100} %.`);
  invariant(
    Math.abs(values.clientWidth - expectedWidth) <= 24,
    `${route} : largeur CSS ${values.clientWidth}, attendu environ ${expectedWidth.toFixed(1)} à ${factor * 100} %.`,
  );
  invariant(
    values.documentScrollWidth <= values.clientWidth + 1,
    `${route} : débordement horizontal du document à ${factor * 100} %.`,
  );
  invariant(
    values.bodyScrollWidth <= values.clientWidth + 1,
    `${route} : débordement horizontal du body à ${factor * 100} %.`,
  );
  return { route, zoomPercent: factor * 100, ...values };
}

mkdirSync(evidenceDirectory, { recursive: true });
const storageState = loadStorageState();
const context = await chromium.launchPersistentContext(userDataDirectory, {
  channel: 'chromium',
  headless: false,
  viewport: null,
  args: [
    '--window-size=1280,900',
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
});

try {
  await context.addCookies(cookiesForTarget(storageState.cookies ?? []));
  const worker = await waitForExtensionWorker(context);
  const page = context.pages()[0] ?? (await context.newPage());
  const results = [];

  for (const route of auditedRoutes) {
    const response = await page.goto(new URL(route, baseURL).toString(), {
      waitUntil: 'domcontentloaded',
    });
    invariant(response?.ok(), `${route} : réponse HTTP invalide.`);
    await page.waitForLoadState('networkidle');
    if (privateRoutes.includes(route)) {
      invariant(new URL(page.url()).pathname === route, `${route} : session privée redirigée.`);
    }
    if (correctivePreview) {
      await page.addStyleTag({
        content:
          '.truncate{overflow:visible!important;text-overflow:clip!important;white-space:normal!important;overflow-wrap:break-word!important}',
      });
    }

    await setNativeZoom(worker, page, 1);
    const baseline = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      devicePixelRatio: window.devicePixelRatio,
    }));

    for (const factor of [2, 4]) {
      const actualZoom = await setNativeZoom(worker, page, factor);
      const result = await measure(page, route, factor, baseline.clientWidth);
      const expectedRatio = baseline.devicePixelRatio * factor;
      invariant(
        Math.abs(result.devicePixelRatio - expectedRatio) < 0.05,
        `${route} : devicePixelRatio ${result.devicePixelRatio}, attendu ${expectedRatio}.`,
      );
      results.push({ ...result, actualZoom });

      if (publicRoutes.includes(route)) {
        const slug = route === '/' ? 'accueil' : route.slice(1);
        await page.screenshot({
          path: join(evidenceDirectory, `${slug}-zoom-${factor * 100}.png`),
          fullPage: false,
          scale: 'css',
        });
      }
    }
  }

  const report = {
    executedAt: new Date().toISOString(),
    baseURL,
    browser: await context.browser()?.version(),
    mode: correctivePreview
      ? 'Zoom natif Chromium avec prévisualisation CSS du correctif non encore déployé'
      : 'Zoom natif Chromium via chrome.tabs.setZoom dans une extension locale de test',
    session: 'OAuth réel chargé localement ; cookie et identité non consignés',
    routes: auditedRoutes,
    correctivePreview,
    assertions: {
      zoomLevels: [200, 400],
      noHorizontalOverflow: true,
      mainAndHeadingVisible: true,
      devicePixelRatioTracksZoom: true,
    },
    results,
  };
  const clippingFailures = results.filter(({ clippedElements }) => clippedElements.length > 0);
  report.assertions.noClippedTextOrControl = clippingFailures.length === 0;
  report.clippingFailures = clippingFailures;

  const reportFilename = correctivePreview
    ? 'native-zoom-corrective-preview.json'
    : baseURL.startsWith('http://localhost')
      ? 'native-zoom-local.json'
      : 'native-zoom-production.json';
  writeFileSync(
    join(evidenceDirectory, reportFilename),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
  console.info(`Zoom natif : ${results.length}/${results.length} mesures exécutées.`);
  console.info(`Rapport : ${join(evidenceDirectory, reportFilename)}`);
  invariant(
    clippingFailures.length === 0,
    `${clippingFailures.length} contrôle(s) contiennent du texte ou une commande rognés.`,
  );
} finally {
  await context.close();
  rmSync(userDataDirectory, { recursive: true, force: true });
}
