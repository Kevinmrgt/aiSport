import { test, expect } from '@playwright/test';

// Tests E2E — Authentification et protection des routes (OWASP A01)
const accessRestricted = (process.env['PRODUCTION_ACCESS_MODE'] ?? 'public') !== 'public';

test.describe('Page de connexion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('affiche le bouton de connexion Google', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const googleBtn = page
      .getByRole('button', { name: /google/i })
      .or(page.getByRole('link', { name: /google/i }));
    await expect(googleBtn.first()).toBeVisible();
  });

  test('respecte les fournisseurs autorisés en mode public ou réservé', async ({ page }) => {
    const response = await page.request.get('/api/auth/providers');
    expect(response.ok()).toBe(true);
    const configuredProviders = await response.json() as Record<string, unknown>;
    const providers = Object.keys(configuredProviders).sort();
    expect(providers).toEqual(accessRestricted ? ['google'] : ['beta', 'google']);
    await expect(page.locator('input[type="password"]')).toHaveCount(accessRestricted ? 0 : 1);
    if (accessRestricted) {
      await expect(page.getByRole('group', { name: 'Accès bêta' })).toHaveCount(0);
    } else {
      await expect(page.getByRole('group', { name: 'Accès bêta' })).toBeVisible();
      await expect(page.getByLabel('Adresse e-mail', { exact: true })).toBeVisible();
      await expect(page.getByLabel('Mot de passe bêta', { exact: true })).toBeVisible();
    }
    await expect(page.getByRole('group', { name: /jury/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /explorer l’aperçu/i })).toHaveCount(0);
  });

  test('RGAA 4.1 — le bouton Google a un aria-label ou texte explicite', async ({ page }) => {
    const googleBtn = page
      .getByRole('button', { name: /google/i })
      .or(page.getByRole('link', { name: /google/i }));
    await expect(googleBtn.first()).toBeVisible();
  });
});

test.describe('Protection des routes (OWASP A01)', () => {
  test('/admin redirige vers /login sans session', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/generate redirige vers /login sans session', async ({ page }) => {
    await page.goto('/generate');
    // Next.js redirect → on doit atterrir sur /login
    await expect(page).toHaveURL(/\/login/);
  });

  test('/workouts redirige vers /login sans session', async ({ page }) => {
    await page.goto('/workouts');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/workouts/[id] redirige vers /login sans session', async ({ page }) => {
    await page.goto('/workouts/some-workout-id', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});

test.describe('Page 404', () => {
  test('une URL inexistante affiche la page 404 accessible', async ({ page }) => {
    await page.goto('/cette-page-nexiste-pas');
    // Next.js not-found.tsx
    await expect(page.getByRole('heading', { name: /introuvable/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /retour a l'accueil/i })).toBeVisible();
  });
});
