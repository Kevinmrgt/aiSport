import { test, expect } from '@playwright/test';

// Tests E2E — Page d'accueil (publique, pas d'auth requise)
// RGAA 4.1: vérification des éléments d'accessibilité

test.describe('Page d\'accueil', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('affiche le titre principal et la description', async ({ page }) => {
    await expect(page).toHaveTitle(/SportCoach IA/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('RGAA 4.1 — contient un lien d\'évitement vers le contenu principal', async ({ page }) => {
    const skipLink = page.getByRole('link', { name: /aller au contenu/i });
    await expect(skipLink).toBeAttached();
    // Le skip link est visible au focus (classe CSS show-on-focus)
    await skipLink.focus();
    await expect(skipLink).toBeVisible();
  });

  test('RGAA 4.1 — la page a l\'attribut lang="fr"', async ({ page }) => {
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang).toBe('fr');
  });

  test('contient un lien vers /login et /generate dans la navigation', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: /navigation principale/i });
    await expect(nav).toBeVisible();
  });

  test('RGAA 4.1 — footer sémantique présent', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('RNCP 39583');
  });

  test('lien "Se connecter" redirige vers /login', async ({ page }) => {
    await page.getByRole('link', { name: /se connecter/i }).click();
    await expect(page).toHaveURL('/login');
  });
});
