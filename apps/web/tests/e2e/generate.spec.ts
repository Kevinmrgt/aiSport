import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

const sessionFile = process.env['PLAYWRIGHT_AUTH_STORAGE'];

function validateAuthenticatedStorageState(storagePath: string): void {
  if (!existsSync(storagePath)) {
    throw new Error(`PLAYWRIGHT_AUTH_STORAGE introuvable: ${storagePath}`);
  }

  const state = JSON.parse(readFileSync(storagePath, 'utf8')) as {
    cookies?: Array<{ name?: string; value?: string }>;
  };
  const hasAuthSession = state.cookies?.some(
    (cookie) =>
      Boolean(cookie.value) &&
      ['authjs.session-token', '__Secure-authjs.session-token'].includes(cookie.name ?? ''),
  );

  if (!hasAuthSession) {
    throw new Error(
      'Le storageState ne contient aucun cookie de session Auth.js. Une vraie session de test est requise.',
    );
  }
}

// Cette suite ne simule pas une authentification : elle exige un storageState
// issu d'un compte OAuth de test dedie. Sans lui, les tests sont marques ignores.
test.describe('Formulaire de generation (session OAuth de test requise)', () => {
  test.skip(!sessionFile, 'PLAYWRIGHT_AUTH_STORAGE non fourni : suite authentifiee non executee.');
  test.use({ storageState: sessionFile ?? { cookies: [], origins: [] } });

  test.beforeAll(() => {
    if (sessionFile) validateAuthenticatedStorageState(sessionFile);
  });

  test('affiche le formulaire de generation apres connexion', async ({ page }) => {
    await page.goto('/generate');
    await expect(page).toHaveURL('/generate');
    await expect(page.getByRole('heading', { name: /creer une seance/i })).toBeVisible();
  });

  test('tous les champs ont un label associe', async ({ page }) => {
    await page.goto('/generate');
    const inputs = page.locator('input, select, textarea');
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
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('annonce les erreurs de formulaire via aria-live', async ({ page }) => {
    await page.goto('/generate');
    await expect(page.locator('[aria-live]').first()).toBeAttached();
  });
});
