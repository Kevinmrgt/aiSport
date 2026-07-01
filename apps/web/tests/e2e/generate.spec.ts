import { test, expect, type Page } from '@playwright/test';
import path from 'path';

// Fixture : session Auth.js simulée pour les tests E2E authentifiés
// Le fichier session.json est créé via le script setup/auth-setup.ts
const SESSION_FILE = path.join(__dirname, '../fixtures/session.json');

// Tests E2E avec session mockée — flux de création de séance avec Alcide
test.describe('Formulaire de génération (avec session)', () => {
  test.use({ storageState: SESSION_FILE });

  test('affiche le formulaire de génération après connexion', async ({ page }) => {
    await page.goto('/generate');
    // Doit rester sur /generate (pas de redirect)
    await expect(page).toHaveURL('/generate');
    await expect(page.getByRole('heading', { name: /creer une seance/i })).toBeVisible();
  });

  test('RGAA 4.1 — tous les champs ont un label associé', async ({ page }) => {
    await page.goto('/generate');

    // Vérifier que chaque input a un label
    const inputs = page.locator('input, select, textarea');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        await expect(label).toBeAttached();
      }
    }
  });

  test('validation Zod côté client — champ sport vide', async ({ page }) => {
    await page.goto('/generate');

    // Soumettre sans remplir sport
    await page.getByRole('button', { name: /generer la seance/i }).click();

    // Message d'erreur visible
    const error = page.getByRole('alert');
    await expect(error).toBeVisible();
  });

  test('RGAA 4.1 — erreurs de formulaire annoncées via aria-live', async ({ page }) => {
    await page.goto('/generate');

    // La zone aria-live doit être présente
    const liveRegion = page.locator('[aria-live]');
    await expect(liveRegion.first()).toBeAttached();
  });
});

// Fixtures setup helper — crée la session mockée pour Playwright
// À exécuter via: npx playwright test --global-setup=tests/e2e/setup/auth-setup.ts
async function createMockSession(page: Page) {
  // Auth.js stocke la session dans un cookie HTTP-only
  // En test, on peut injecter un cookie de session de test
  await page.context().addCookies([
    {
      name: 'authjs.session-token',
      value: 'test-session-token-for-e2e',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
    },
  ]);
}

// Export pour réutilisation dans d'autres tests
export { createMockSession };
