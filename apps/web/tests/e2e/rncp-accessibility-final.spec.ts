import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, readFileSync } from 'node:fs';

const storageState = process.env['PLAYWRIGHT_AUTH_STORAGE'];
const sessionCookieNames = ['authjs.session-token', '__Secure-authjs.session-token'];

const publicRoutes = ['/', '/login', '/confidentialite'] as const;
const privateRoutes = ['/dashboard', '/generate', '/programs', '/workouts', '/settings'] as const;

type AxeContrastDatum = {
  contrastRatio?: number;
  expectedContrastRatio?: string;
  fgColor?: string;
  bgColor?: string;
};

function validateStorageState(path: string | undefined): asserts path is string {
  expect(path, 'PLAYWRIGHT_AUTH_STORAGE doit pointer vers la session OAuth locale').toBeTruthy();
  expect(existsSync(path!), 'Le storageState OAuth local doit exister').toBe(true);

  const state = JSON.parse(readFileSync(path!, 'utf8')) as {
    cookies?: Array<{ name?: string; value?: string }>;
  };
  const hasSessionCookie = state.cookies?.some(
    (cookie) =>
      Boolean(cookie.value) &&
      sessionCookieNames.some(
        (name) => cookie.name === name || cookie.name?.startsWith(`${name}.`),
      ),
  );
  expect(hasSessionCookie, 'Le storageState doit contenir une vraie session Auth.js').toBe(true);
}

async function expectLoadedRoute(page: Page, route: string) {
  const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
  expect(response?.ok(), `${route} doit repondre sans erreur HTTP`).toBe(true);
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
}

async function auditReflow(page: Page, route: string, width: 640 | 320) {
  await page.setViewportSize({ width, height: 900 });
  await expectLoadedRoute(page, route);

  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));

  expect(dimensions.viewportWidth).toBe(width);
  expect(
    dimensions.documentWidth,
    `${route} deborde horizontalement a ${width}px`,
  ).toBeLessThanOrEqual(width);
  expect(dimensions.bodyWidth, `${route} deborde horizontalement a ${width}px`).toBeLessThanOrEqual(
    width,
  );
}

async function auditFullKeyboardCycle(page: Page, route: string) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await expectLoadedRoute(page, route);

  const expectedKeys = await page.evaluate(() => {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[contenteditable="true"]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    const all = [...document.querySelectorAll<HTMLElement>(selector)].filter((element) => {
      const style = getComputedStyle(element);
      return (
        element.tabIndex >= 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        element.getClientRects().length > 0
      );
    });

    const retainedRadioGroups = new Set<string>();
    const tabbable = all.filter((element) => {
      if (!(element instanceof HTMLInputElement) || element.type !== 'radio' || !element.name) {
        return true;
      }
      if (element.checked) {
        retainedRadioGroups.add(element.name);
        return true;
      }
      if (retainedRadioGroups.has(element.name)) return false;
      const checked = document.querySelector<HTMLInputElement>(
        `input[type="radio"][name="${CSS.escape(element.name)}"]:checked`,
      );
      if (checked) return false;
      retainedRadioGroups.add(element.name);
      return true;
    });

    return tabbable.map((element, index) => {
      const key = `${index}:${element.tagName.toLowerCase()}:${element.id || element.getAttribute('name') || element.getAttribute('href') || element.textContent?.trim().slice(0, 32) || 'sans-nom'}`;
      element.dataset.rncpTabKey = key;
      return key;
    });
  });

  expect(expectedKeys.length, `${route} doit proposer des commandes au clavier`).toBeGreaterThan(1);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

  const visited: string[] = [];
  const focusIndicators: Array<{ key: string; focusVisible: boolean; visibleIndicator: boolean }> =
    [];
  for (let index = 0; index < expectedKeys.length + 2; index += 1) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      if (!element) return null;
      const style = getComputedStyle(element);
      return {
        tagName: element.tagName,
        key: element.dataset.rncpTabKey ?? '',
        focusVisible: element.matches(':focus-visible'),
        visibleIndicator:
          (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) ||
          style.boxShadow !== 'none',
      };
    });
    if (!focused?.key && focused?.tagName === 'BODY' && visited.length === expectedKeys.length) {
      break;
    }
    expect(focused?.key, `${route} contient une etape de tabulation non identifiee`).toBeTruthy();
    if (focused!.key === visited[0] && visited.length > 0) break;
    visited.push(focused!.key);
    focusIndicators.push(focused!);
  }

  expect(new Set(visited), `${route} : le cycle Tab doit visiter toutes les commandes`).toEqual(
    new Set(expectedKeys),
  );
  expect(
    focusIndicators.every(({ focusVisible, visibleIndicator }) => focusVisible && visibleIndicator),
    `${route} : chaque focus clavier doit etre perceptible`,
  ).toBe(true);
}

async function auditContrast(page: Page, route: string) {
  await expectLoadedRoute(page, route);
  const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  expect(results.violations, `${route} : violations de contraste axe`).toEqual([]);

  const pass = results.passes.find(({ id }) => id === 'color-contrast');
  const measured =
    pass?.nodes.flatMap((node) =>
      [...node.any, ...node.all, ...node.none]
        .map(({ data }) => data as AxeContrastDatum | null)
        .filter(
          (data): data is AxeContrastDatum =>
            typeof data?.contrastRatio === 'number' && Number.isFinite(data.contrastRatio),
        ),
    ) ?? [];
  const actionContrast = await page
    .locator('.action-primary, button[type="submit"]')
    .first()
    .evaluate((element) => {
      function parseRgb(value: string) {
        const channels = value
          .match(/[\d.]+/g)
          ?.slice(0, 3)
          .map(Number);
        if (!channels || channels.length !== 3) throw new Error(`Couleur RGB invalide: ${value}`);
        return channels;
      }
      function luminance(channels: number[]) {
        const linear = channels.map((channel) => {
          const value = channel / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
      }

      const style = getComputedStyle(element);
      const foreground = luminance(parseRgb(style.color));
      const background = luminance(parseRgb(style.backgroundColor));
      return {
        foreground: style.color,
        background: style.backgroundColor,
        ratio:
          (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05),
      };
    });
  expect(actionContrast.ratio, `${route} : contraste du bouton principal`).toBeGreaterThanOrEqual(
    4.5,
  );

  const minimumRatio = Math.min(
    actionContrast.ratio,
    ...measured.map(({ contrastRatio }) => contrastRatio!),
  );
  test.info().annotations.push({
    type: 'RNCP contraste',
    description: `${route}: ${measured.length} mesure(s) axe + bouton principal ${actionContrast.ratio.toFixed(2)}:1, ratio minimal ${minimumRatio.toFixed(2)}:1, ${results.incomplete.length} verification(s) incomplete(s)`,
  });
}

async function auditAccessibilityTree(page: Page, route: string) {
  await expectLoadedRoute(page, route);
  const session = await page.context().newCDPSession(page);
  const { nodes } = await session.send('Accessibility.getFullAXTree');
  await session.detach();

  const exposed = nodes.filter((node) => !node.ignored);
  const roles = exposed.map((node) => String(node.role?.value ?? '')).filter(Boolean);
  const headings = exposed
    .filter((node) => node.role?.value === 'heading')
    .map((node) => String(node.name?.value ?? ''))
    .filter(Boolean);

  expect(roles, `${route} : racine absente de l'arbre d'accessibilite`).toContain('RootWebArea');
  expect(roles, `${route} : contenu principal absent de l'arbre d'accessibilite`).toContain('main');
  expect(roles, `${route} : navigation absente de l'arbre d'accessibilite`).toContain('navigation');
  expect(
    headings.length,
    `${route} : aucun titre expose dans l'arbre d'accessibilite`,
  ).toBeGreaterThan(0);
}

test.describe('RNCP accessibilite finale - pages publiques', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const route of publicRoutes) {
    test(`${route} - reflow equivalent zoom 200 et 400 pour cent`, async ({ page }) => {
      await auditReflow(page, route, 640);
      await auditReflow(page, route, 320);
    });

    test(`${route} - cycle clavier complet et focus visible`, async ({ page }) => {
      await auditFullKeyboardCycle(page, route);
    });

    test(`${route} - contrastes calcules`, async ({ page }) => {
      await auditContrast(page, route);
    });

    test(`${route} - structure exposee dans l'arbre d'accessibilite`, async ({ page }) => {
      await auditAccessibilityTree(page, route);
    });
  }
});

test.describe('RNCP accessibilite finale - pages privees', () => {
  test.beforeAll(() => validateStorageState(storageState));
  test.use({ storageState: storageState ?? { cookies: [], origins: [] } });

  for (const route of privateRoutes) {
    test(`${route} - session active, reflow equivalent zoom 200 et 400 pour cent`, async ({
      page,
    }) => {
      await auditReflow(page, route, 640);
      await expect(page).toHaveURL(new RegExp(`${route.replace('/', '\\/')}(?:\\?.*)?$`));
      await auditReflow(page, route, 320);
      await expect(page).toHaveURL(new RegExp(`${route.replace('/', '\\/')}(?:\\?.*)?$`));
    });

    test(`${route} - cycle clavier complet et focus visible`, async ({ page }) => {
      await auditFullKeyboardCycle(page, route);
    });

    test(`${route} - contrastes calcules`, async ({ page }) => {
      await auditContrast(page, route);
    });

    test(`${route} - structure exposee dans l'arbre d'accessibilite`, async ({ page }) => {
      await auditAccessibilityTree(page, route);
    });
  }

  test('/generate - erreurs exposees comme alertes', async ({ page }) => {
    await expectLoadedRoute(page, '/generate');
    await page.getByRole('button', { name: /generer la seance/i }).click();
    await expect(page.locator('#input-sport-error')).toHaveAttribute('role', 'alert');
    await expect(page.locator('#goals-error')).toHaveAttribute('role', 'alert');
    expect(await page.getByRole('alert').count()).toBeGreaterThanOrEqual(2);
  });
});
