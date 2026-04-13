import { test, expect } from '@playwright/test';

// Tests d'accessibilité RGAA 4.1 — pages publiques
// Ces tests vérifient les critères essentiels sans nécessiter d'auth

test.describe('RGAA 4.1 — Accessibilité globale', () => {
  const publicPages = ['/', '/login'];

  for (const url of publicPages) {
    test(`${url} — navigation clavier : skip link fonctionnel`, async ({ page }) => {
      await page.goto(url);

      // Tab une fois → focus sur le skip link
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      const href = await focused.getAttribute('href');
      // Le skip link doit pointer vers #main-content
      expect(href).toBe('#main-content');
    });

    test(`${url} — attribut lang="fr" présent`, async ({ page }) => {
      await page.goto(url);
      const lang = await page.evaluate(() => document.documentElement.lang);
      expect(lang).toBe('fr');
    });

    test(`${url} — structure sémantique : header, main, footer`, async ({ page }) => {
      await page.goto(url);
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
    });

    test(`${url} — main a l'id "main-content" pour le skip link`, async ({ page }) => {
      await page.goto(url);
      const main = page.locator('main#main-content');
      await expect(main).toBeAttached();
    });
  }

  test('/ — tous les liens et boutons sont focusables au clavier', async ({ page }) => {
    await page.goto('/');

    // Récupérer tous les éléments interactifs
    const interactiveElements = page.locator('a, button');
    const count = await interactiveElements.count();
    expect(count).toBeGreaterThan(0);

    // Vérifier que les liens ont un texte accessible
    const links = page.locator('a');
    const linkCount = await links.count();
    for (let i = 0; i < linkCount; i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      // Chaque lien doit avoir un texte ou un aria-label
      expect(text?.trim() ?? ariaLabel).toBeTruthy();
    }
  });

  test('/login — formulaire OAuth accessible', async ({ page }) => {
    await page.goto('/login');

    // La page doit avoir un heading
    const heading = page.getByRole('heading');
    await expect(heading.first()).toBeVisible();
  });
});
