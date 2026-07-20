import { expect, test } from '@playwright/test';
import { chmodSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const expectedEmail = process.env['E2E_AUTH_EMAIL']?.trim().toLowerCase();
const storagePath = resolve(
  process.cwd(),
  process.env['PLAYWRIGHT_AUTH_STORAGE'] ?? 'playwright/.auth/google-e2e.json',
);

test('capture uniquement la session du compte Google E2E dédié', async ({ page, context }) => {
  expect(expectedEmail, 'E2E_AUTH_EMAIL est obligatoire').toBeTruthy();

  await page.goto('/login');
  await page.getByRole('button', { name: 'Continuer avec Google' }).click();

  console.info(
    `[E2E auth] Connectez maintenant le compte dédié ${expectedEmail}. ` +
      'Ne sélectionnez pas votre compte Google personnel.',
  );

  await page.waitForURL(/\/generate(?:\?.*)?$/, { timeout: 5 * 60_000 });

  const response = await context.request.get('/api/auth/session');
  expect(response.ok(), 'La session Auth.js doit être lisible après OAuth').toBeTruthy();

  const session = (await response.json()) as { user?: { email?: string | null } };
  const authenticatedEmail = session.user?.email?.trim().toLowerCase();

  expect(
    authenticatedEmail,
    'Compte incorrect : la session n’est pas enregistrée. Recommencez avec le compte E2E dédié.',
  ).toBe(expectedEmail);

  mkdirSync(dirname(storagePath), { recursive: true });
  await context.storageState({ path: storagePath });
  chmodSync(storagePath, 0o600);

  console.info(`[E2E auth] Session dédiée enregistrée hors Git : ${storagePath}`);
});
