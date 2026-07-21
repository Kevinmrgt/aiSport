import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

const sessionFile = process.env['PLAYWRIGHT_AUTH_STORAGE'];
const expectedEmail = process.env['E2E_AUTH_EMAIL']?.trim().toLowerCase();

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
    throw new Error('Une vraie session Auth.js de recette est requise.');
  }
}

async function readCompletedCount(page: import('@playwright/test').Page): Promise<number> {
  const definition = page
    .locator('dt', { hasText: /^Termine$/ })
    .locator('..')
    .locator('dd');
  const raw = (await definition.textContent())?.trim() ?? '';
  const parsed = Number(raw);
  expect(Number.isInteger(parsed)).toBe(true);
  return parsed;
}

test.describe('recettes metier finales avec session OAuth dediee', () => {
  test.skip(!sessionFile, 'PLAYWRIGHT_AUTH_STORAGE non fourni.');
  test.use({ storageState: sessionFile ?? { cookies: [], origins: [] } });

  test.beforeAll(() => {
    if (sessionFile) validateAuthenticatedStorageState(sessionFile);
  });

  test.beforeEach(async ({ request }) => {
    expect(expectedEmail, 'E2E_AUTH_EMAIL est obligatoire').toBeTruthy();
    const response = await request.get('/api/auth/session');
    expect(response.ok()).toBe(true);
    const session = (await response.json()) as { user?: { email?: string | null } };
    expect(session.user?.email?.trim().toLowerCase()).toBe(expectedEmail);
  });

  test('CR-037 change un modele autorise, verifie sa persistance puis restaure la valeur', async ({
    page,
  }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings$/);
    const model = page.getByLabel('Modele OpenAI');
    await expect(model).toBeVisible();
    const initialModel = await model.inputValue();
    const alternateModel = initialModel === 'gpt-5.4' ? 'gpt-5.4-mini' : 'gpt-5.4';

    try {
      await model.selectOption(alternateModel);
      await page.getByRole('button', { name: 'Enregistrer' }).click();
      await expect(page.getByRole('status')).toContainText('Parametres sauvegardes.');
      await page.reload();
      await expect(page.getByLabel('Modele OpenAI')).toHaveValue(alternateModel);
    } finally {
      await page.getByLabel('Modele OpenAI').selectOption(initialModel);
      await page.getByRole('button', { name: 'Enregistrer' }).click();
      await expect(page.getByRole('status')).toContainText('Parametres sauvegardes.');
    }
  });

  test('CR-030/034/041/065 termine une seance, journalise le retour et actualise le dashboard', async ({
    page,
  }) => {
    await page.goto('/programs');
    await expect(page).toHaveURL(/\/programs(?:\?.*)?$/);
    await expect(page.getByRole('heading', { name: 'Mes programmes' })).toBeVisible();

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);
    const completedBefore = await readCompletedCount(page);

    await page.goto('/workouts');
    await expect(page).toHaveURL(/\/workouts(?:\?.*)?$/);
    const firstWorkout = page.getByRole('link', { name: /voir l'entrainement/i }).first();
    await expect(
      firstWorkout,
      'Le compte de recette doit contenir au moins une seance',
    ).toBeVisible();
    await firstWorkout.click();
    await expect(page).toHaveURL(/\/workouts\/[0-9a-f-]+$/i);
    await expect(page.getByRole('heading', { name: 'Timer' })).toBeVisible();

    for (let step = 0; step < 50; step += 1) {
      if (
        await page
          .getByText('Seance terminee', { exact: true })
          .isVisible()
          .catch(() => false)
      ) {
        break;
      }

      const skip = page
        .getByRole('button')
        .filter({ hasText: /^(Passer|Passer le repos|Terminer)$/ })
        .first();
      await expect(skip, `Controle de passage absent a l etape ${step + 1}`).toBeVisible();
      await skip.click();
    }

    await expect(page.getByText('Seance terminee', { exact: true })).toBeVisible();
    await page.getByLabel('7').check({ force: true });
    await page.getByLabel('Bien dose').check({ force: true });
    await page
      .getByLabel('Douleur eventuelle')
      .fill('Recette RNCP : gene legere temporaire, donnee de test.');
    await page
      .getByLabel('Notes', { exact: true })
      .fill('Parcours final automatise du 2026-07-21.');
    await page.getByRole('button', { name: 'Enregistrer le retour' }).click();

    const completionOutcome = await Promise.race([
      page
        .getByText('Retour enregistre.', { exact: true })
        .waitFor({ state: 'visible' })
        .then(() => 'confirmation-visible' as const),
      page
        .getByRole('button', { name: 'Demarrer' })
        .waitFor({ state: 'visible' })
        .then(() => 'page-rechargee' as const),
    ]);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect.poll(async () => readCompletedCount(page)).toBe(completedBefore + 1);
    const completedAfter = await readCompletedCount(page);
    console.info(
      `[RNCP CR-065] dashboard ${completedBefore} -> ${completedAfter}; formulaire=${completionOutcome}`,
    );
    await expect(page.getByText('Temps realise')).toBeVisible();
    await expect(page.getByText('Effort moyen')).toBeVisible();
  });
});
