import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, readFileSync } from 'node:fs';

const sessionFile = process.env['PLAYWRIGHT_AUTH_STORAGE'];

function validateAuthenticatedStorageState(storagePath: string): void {
  if (!existsSync(storagePath)) {
    throw new Error(`PLAYWRIGHT_AUTH_STORAGE introuvable: ${storagePath}`);
  }

  const state = JSON.parse(readFileSync(storagePath, 'utf8')) as {
    cookies?: Array<{ name?: string; value?: string }>;
  };
  const sessionCookieNames = ['authjs.session-token', '__Secure-authjs.session-token'];
  const hasAuthSession = state.cookies?.some(
    (cookie) =>
      Boolean(cookie.value) &&
      sessionCookieNames.some(
        (name) => cookie.name === name || cookie.name?.startsWith(`${name}.`),
      ),
  );

  if (!hasAuthSession) {
    throw new Error(
      'Le storageState ne contient aucun cookie de session Auth.js. Une vraie session de test est requise.',
    );
  }
}

const expectedEmail = process.env['E2E_AUTH_EMAIL']?.trim().toLowerCase();

// Cette suite ne simule pas une authentification : elle exige un storageState
// issu d'un compte OAuth de test dédié et vérifie son identité via Auth.js.
test.describe('Formulaire de generation (session OAuth de test requise)', () => {
  test.skip(!sessionFile, 'PLAYWRIGHT_AUTH_STORAGE non fourni : suite authentifiee non executee.');
  test.use({ storageState: sessionFile ?? { cookies: [], origins: [] } });

  test.beforeAll(() => {
    if (sessionFile) validateAuthenticatedStorageState(sessionFile);
  });

  test.beforeEach(async ({ request }) => {
    expect(expectedEmail, 'E2E_AUTH_EMAIL est obligatoire').toBeTruthy();
    const response = await request.get('/api/auth/session');
    expect(response.ok(), 'La session Auth.js doit être valide').toBeTruthy();
    const session = (await response.json()) as { user?: { email?: string | null } };
    expect(session.user?.email?.trim().toLowerCase()).toBe(expectedEmail);
  });

  test('affiche le formulaire de generation apres connexion', async ({ page }) => {
    await page.goto('/generate');
    await expect(page).toHaveURL('/generate');
    await expect(page.getByRole('heading', { name: /creer une seance/i })).toBeVisible();
  });

  test('tous les champs ont un label associe', async ({ page }) => {
    await page.goto('/generate');
    const form = page.getByRole('form', { name: 'Construire le training' });
    await expect(form).toBeVisible();
    const inputs = form.locator('input:not([type="hidden"]), select, textarea');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      expect(id, `Champ ${i + 1} sans identifiant`).toBeTruthy();
      await expect(page.locator(`label[for="${id}"]`)).toBeAttached();
    }
  });

  test('signale le champ sport vide', async ({ page }) => {
    await page.goto('/generate');
    await page.getByRole('button', { name: /generer la seance/i }).click();
    const sportError = page.locator('#input-sport-error');
    await expect(sportError).toBeVisible();
    await expect(sportError).toContainText('Le sport ne peut pas être vide');
  });

  test('annonce chaque erreur de champ avec role alert', async ({ page }) => {
    await page.goto('/generate');
    await page.getByRole('button', { name: /generer la seance/i }).click();
    await expect(page.locator('#input-sport-error')).toHaveAttribute('role', 'alert');
    const goalsError = page.locator('#goals-error');
    await expect(goalsError).toHaveAttribute('role', 'alert');
    await expect(goalsError).toBeVisible();
    await expect(goalsError).toContainText('L’objectif ne peut pas être vide');
  });

  test('reste utilisable sans débordement horizontal sur un écran mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/generate');
    const form = page.getByRole('form', { name: 'Construire le training' });
    await expect(form).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      contentWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
    await expect(page.getByRole('button', { name: /generer la seance/i })).toBeVisible();
  });

  test('ne présente aucune violation axe critique ou sérieuse sur le formulaire authentifié', async ({
    page,
  }) => {
    await page.goto('/generate');
    await expect(page.getByRole('form', { name: 'Construire le training' })).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    const blockingViolations = results.violations.filter(({ impact }) =>
      ['critical', 'serious'].includes(impact ?? ''),
    );
    expect(blockingViolations).toEqual([]);
  });
});
