import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

type BrowserEvidence = {
  route: string;
  finalUrl: string;
  httpStatus: number | null;
  viewport: { width: number; height: number } | null;
  documentWidth: number;
  bodyTextLength: number;
  consoleErrors: string[];
  pageErrors: string[];
  axeViolations: Array<{
    id: string;
    impact: string | null | undefined;
    description: string;
    targets: unknown[];
  }>;
};

const evidenceDir = path.resolve(
  process.cwd(),
  '../../docs/rncp/bloc2-annexes/browser-evidence-2026-07-20',
);

function slugForRoute(route: string) {
  return route === '/' ? 'accueil' : route.replace(/^\//, '').replaceAll('/', '-');
}

const pages = [
  { route: '/', slug: 'accueil' },
  { route: '/login', slug: 'connexion' },
  { route: '/confidentialite', slug: 'confidentialite' },
  { route: '/cette-page-nexiste-pas', slug: 'page-404' },
] as const;

test.describe('preuves navigateur publiques - viewport 320 px', () => {
  test.use({ viewport: { width: 320, height: 720 } });

  for (const { route, slug } of pages) {
    test(`${route} - reflow, console, axe et capture`, async ({ page }, testInfo) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => pageErrors.push(error.message));

      const response = await page.goto(route, { waitUntil: 'networkidle' });

      const dimensions = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        bodyTextLength: document.body.innerText.trim().length,
      }));
      const axe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const evidence: BrowserEvidence = {
        route,
        finalUrl: page.url(),
        httpStatus: response?.status() ?? null,
        viewport: page.viewportSize(),
        documentWidth: dimensions.documentWidth,
        bodyTextLength: dimensions.bodyTextLength,
        consoleErrors,
        pageErrors,
        axeViolations: axe.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          description: violation.description,
          targets: violation.nodes.map((node) => node.target),
        })),
      };

      await mkdir(evidenceDir, { recursive: true });
      await writeFile(
        path.join(evidenceDir, `${testInfo.project.name}-${slug}.json`),
        `${JSON.stringify(evidence, null, 2)}\n`,
        'utf8',
      );
      await page.screenshot({
        path: path.join(evidenceDir, `${testInfo.project.name}-${slug}.png`),
        fullPage: true,
      });

      expect(dimensions.bodyTextLength).toBeGreaterThan(0);
      expect(dimensions.documentWidth).toBeLessThanOrEqual(320);
      if (route === '/cette-page-nexiste-pas') {
        expect(response?.status()).toBe(404);
        expect(
          consoleErrors.every(
            (message) =>
              message ===
              'Failed to load resource: the server responded with a status of 404 (Not Found)',
          ),
        ).toBe(true);
      } else {
        expect(response?.status()).toBe(200);
        expect(consoleErrors).toEqual([]);
      }
      expect(pageErrors).toEqual([]);
      expect(axe.violations, JSON.stringify(evidence.axeViolations, null, 2)).toEqual([]);
    });
  }
});

test.describe('preuves clavier publiques', () => {
  for (const route of ['/', '/login', '/confidentialite']) {
    test(`${route} - activation du lien d'evitement`, async ({ page }, testInfo) => {
      await page.goto(route, { waitUntil: 'networkidle' });
      await page.keyboard.press('Tab');

      const focusedBeforeActivation = await page.evaluate(() => ({
        text: document.activeElement?.textContent?.trim(),
        href: document.activeElement?.getAttribute('href'),
      }));
      expect(focusedBeforeActivation).toEqual({
        text: 'Aller au contenu principal',
        href: '#main-content',
      });

      await page.locator(':focus').press('Enter');
      await expect(page.locator('main#main-content')).toBeFocused();

      const focusedAfterActivation = await page.evaluate(() => ({
        hash: window.location.hash,
        tagName: document.activeElement?.tagName,
        id: document.activeElement?.id,
      }));
      await mkdir(evidenceDir, { recursive: true });
      await writeFile(
        path.join(
          evidenceDir,
          `${testInfo.project.name}-${slugForRoute(route)}-clavier.json`,
        ),
        `${JSON.stringify(
          { route, focusedBeforeActivation, focusedAfterActivation },
          null,
          2,
        )}\n`,
        'utf8',
      );
    });
  }

  test('/login - le bouton Google est atteignable et nomme', async ({ page }, testInfo) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    const googleButton = page.getByRole('button', { name: 'Continuer avec Google' });
    await googleButton.focus();
    await expect(googleButton).toBeFocused();
    await expect(googleButton).toHaveAccessibleName('Continuer avec Google');

    const buttonEvidence = await googleButton.evaluate((element) => ({
      focused: document.activeElement === element,
      text: element.textContent?.trim(),
      decorativeLetterHidden:
        element.querySelector('[aria-hidden="true"]')?.textContent?.trim() === 'G',
    }));
    await mkdir(evidenceDir, { recursive: true });
    await writeFile(
      path.join(evidenceDir, `${testInfo.project.name}-connexion-bouton-google.json`),
      `${JSON.stringify(buttonEvidence, null, 2)}\n`,
      'utf8',
    );
  });
});

test.describe('preuves de protection sans session', () => {
  for (const route of ['/generate', '/programs', '/workouts', '/settings']) {
    test(`${route} - redirection observee vers la connexion`, async ({ page }, testInfo) => {
      const response = await page.goto(route, { waitUntil: 'networkidle' });
      expect(response).not.toBeNull();
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(
        'Reprendre votre entrainement',
      );

      await mkdir(evidenceDir, { recursive: true });
      await writeFile(
        path.join(
          evidenceDir,
          `${testInfo.project.name}-redirection-${slugForRoute(route)}.json`,
        ),
        `${JSON.stringify(
          {
            requestedRoute: route,
            finalUrl: page.url(),
            finalHttpStatus: response?.status() ?? null,
            heading: await page.getByRole('heading', { level: 1 }).textContent(),
          },
          null,
          2,
        )}\n`,
        'utf8',
      );
    });
  }
});
