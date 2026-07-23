import { test, expect } from '@playwright/test';

// Tests E2E — Authentification et protection des routes (OWASP A01)

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

  test('RGAA 4.1 — le bouton Google a un aria-label ou texte explicite', async ({ page }) => {
    const googleBtn = page
      .getByRole('button', { name: /google/i })
      .or(page.getByRole('link', { name: /google/i }));
    await expect(googleBtn.first()).toBeVisible();
  });

  test('affiche un accès jury avec des champs explicitement étiquetés', async ({ page }) => {
    await expect(page.getByRole('group', { name: /accès jury/i })).toBeVisible();
    await expect(page.getByLabel(/identifiant jury/i)).toHaveAttribute('autocomplete', 'username');
    await expect(page.getByLabel(/mot de passe/i)).toHaveAttribute(
      'autocomplete',
      'current-password',
    );
  });

  test('crée une vraie session Auth.js jury puis permet la déconnexion', async ({ page }) => {
    const identifier = process.env['E2E_JURY_IDENTIFIER'] ?? 'jury-playwright';
    const password = process.env['E2E_JURY_PASSWORD'] ?? 'jury-playwright-password-2026';

    await page.getByLabel(/identifiant jury/i).fill(identifier);
    await page.getByLabel(/mot de passe/i).fill(password);
    await page.locator('input[name="redirectTo"]').evaluate((input) => {
      (input as HTMLInputElement).value = '/';
    });
    await page.getByRole('button', { name: /ouvrir l’espace de démonstration/i }).click();

    await expect(page).toHaveURL(/\/$/);
    const session = await page.request.get('/api/auth/session');
    expect(session.ok()).toBe(true);
    await expect
      .poll(async () => ((await session.json()) as { user?: { email?: string } }).user?.email)
      .toBe('jury-playwright@alcide.invalid');

    await page.getByRole('button', { name: /se deconnecter/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('link', { name: /se connecter/i })).toBeVisible();
    await expect
      .poll(async () => {
        const signedOutSession = await page.request.get('/api/auth/session');
        const body = (await signedOutSession.json()) as { user?: unknown } | null;
        return body?.user ?? null;
      })
      .toBeNull();
    await page.goto('/generate');
    await expect(page).toHaveURL(/\/login/);
  });

  test('refuse un mauvais secret avec un message générique et sans session', async ({ page }) => {
    await page.getByLabel(/identifiant jury/i).fill('jury-playwright');
    await page.getByLabel(/mot de passe/i).fill('mot-de-passe-invalide');
    await page.getByRole('button', { name: /ouvrir l’espace de démonstration/i }).click();

    await expect(page).toHaveURL(/\/login\?error=CredentialsSignin/);
    await expect(
      page.getByRole('alert').filter({ hasText: /connexion impossible/i }),
    ).toBeVisible();
    const response = await page.request.get('/api/auth/session');
    const session = (await response.json()) as { user?: unknown } | null;
    expect(session?.user ?? null).toBeNull();
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
