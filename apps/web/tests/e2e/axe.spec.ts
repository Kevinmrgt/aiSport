import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// RGAA 4.1 / WCAG 2.1 — Détection automatique des violations d'accessibilité via axe-core
// Ces tests complètent les tests manuels RGAA de accessibility.spec.ts

test.describe('axe-core — Violations WCAG automatiques', () => {
  test('/ — aucune violation WCAG critique', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Filtrer les violations de niveau critique et sérieux uniquement
    const serious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    if (serious.length > 0) {
      const report = serious
        .map((v) => `[${v.impact}] ${v.id}: ${v.description}`)
        .join('\n');
      expect(serious, `Violations WCAG détectées :\n${report}`).toHaveLength(0);
    }

    expect(serious).toHaveLength(0);
  });

  test('/login — aucune violation WCAG critique', async ({ page }) => {
    await page.goto('/login');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    if (serious.length > 0) {
      const report = serious
        .map((v) => `[${v.impact}] ${v.id}: ${v.description}`)
        .join('\n');
      expect(serious, `Violations WCAG détectées :\n${report}`).toHaveLength(0);
    }

    expect(serious).toHaveLength(0);
  });
});
