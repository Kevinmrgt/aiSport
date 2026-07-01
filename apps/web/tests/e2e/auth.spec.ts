import { test, expect } from '@playwright/test';

// Tests E2E — Authentification et protection des routes (OWASP A01)

test.describe('Page de connexion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('affiche le bouton de connexion Google', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const googleBtn = page.getByRole('button', { name: /google/i })
      .or(page.getByRole('link', { name: /google/i }));
    await expect(googleBtn.first()).toBeVisible();
  });

  test('RGAA 4.1 — le bouton Google a un aria-label ou texte explicite', async ({ page }) => {
    const googleBtn = page.getByRole('button', { name: /google/i })
      .or(page.getByRole('link', { name: /google/i }));
    await expect(googleBtn.first()).toBeVisible();
  });
});

test.describe('Protection des routes (OWASP A01)', () => {
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
    await page.goto('/workouts/some-workout-id');
    await expect(page).toHaveURL(/\/login/);
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
