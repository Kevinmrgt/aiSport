import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '../../..');
const baseURL = process.env.E2E_BASE_URL ?? 'https://ai-sport-web.vercel.app';
const storagePath = resolve(
  process.cwd(),
  process.env.PLAYWRIGHT_AUTH_STORAGE ?? 'playwright/.auth/google-e2e.json',
);
const evidenceDirectory = resolve(repositoryRoot, 'tmp/accessibility-final/contrast');
const routes = [
  '/',
  '/login',
  '/confidentialite',
  '/dashboard',
  '/generate',
  '/programs',
  '/workouts',
  '/settings',
];

if (!existsSync(storagePath)) throw new Error(`Session OAuth locale absente : ${storagePath}`);
mkdirSync(evidenceDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    baseURL,
    storageState: storagePath,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  const pages = [];

  for (const route of routes) {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    if (!response?.ok()) throw new Error(`${route} : réponse HTTP invalide.`);
    await page.waitForLoadState('networkidle');
    if (new URL(page.url()).pathname !== route) throw new Error(`${route} : redirection inattendue.`);

    const axe = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    const incomplete = [];
    for (const result of axe.incomplete) {
      for (const node of result.nodes) {
        const selector = node.target[0];
        let computedStyle = null;
        if (typeof selector === 'string') {
          const element = page.locator(selector).first();
          if ((await element.count()) > 0) {
            computedStyle = await element.evaluate((target) => {
              const style = getComputedStyle(target);
              const parentStyle = target.parentElement ? getComputedStyle(target.parentElement) : null;
              return {
                text: target.textContent?.trim().replace(/\s+/g, ' ').slice(0, 120) ?? '',
                color: style.color,
                backgroundColor: style.backgroundColor,
                backgroundImage: style.backgroundImage,
                opacity: style.opacity,
                parentBackgroundColor: parentStyle?.backgroundColor ?? null,
                parentBackgroundImage: parentStyle?.backgroundImage ?? null,
              };
            });
          }
        }
        incomplete.push({
          rule: result.id,
          impact: result.impact,
          target: node.target,
          failureSummary: node.failureSummary,
          checks: [...node.any, ...node.all, ...node.none].map(({ message, data }) => ({
            message,
            data,
          })),
          computedStyle,
        });
      }
    }

    pages.push({
      route,
      violations: axe.violations.map(({ id, impact, nodes }) => ({
        id,
        impact,
        targets: nodes.map(({ target }) => target),
      })),
      incomplete,
      passes: axe.passes.reduce((count, result) => count + result.nodes.length, 0),
    });
  }

  const report = {
    executedAt: new Date().toISOString(),
    baseURL,
    browser: browser.version(),
    scope: 'Règle axe color-contrast, détails des vérifications manuelles restantes',
    session: 'OAuth réel local ; aucun cookie ni identifiant consigné',
    pages,
  };
  const target = join(evidenceDirectory, 'contrast-incomplete-audit.json');
  writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  const violationCount = pages.reduce((total, page) => total + page.violations.length, 0);
  const incompleteCount = pages.reduce((total, page) => total + page.incomplete.length, 0);
  console.info(`Contrastes : ${violationCount} violation, ${incompleteCount} cas à vérifier.`);
  console.info(`Rapport : ${target}`);
} finally {
  await browser.close();
}
