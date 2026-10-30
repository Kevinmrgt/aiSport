import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertLocalTestDatabase } from '../../api/tests/helpers/local-ai-fixture.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const webRoot = resolve(root, 'apps/web');
const apiRoot = resolve(root, 'apps/api');
const webRequire = createRequire(resolve(webRoot, 'package.json'));
const apiRequire = createRequire(resolve(apiRoot, 'package.json'));
const origin = 'http://127.0.0.1:3007';
const apiOrigin = 'http://127.0.0.1:3008';

async function unusedPort(port) {
  const server = createServer();
  await new Promise((resolveReady, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolveReady);
  });
  await new Promise((done) => server.close(done));
}

function start(args, env, cwd, onOutput) {
  const child = spawn(process.execPath, args, {
    env,
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  // Drain output without keeping headers, tokens or private error objects.
  if (onOutput) child.stdout.on('data', onOutput);
  else child.stdout.resume();
  child.stderr.resume();
  return child;
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
  const exited = once(child, 'exit').catch(() => undefined);
  child.kill('SIGTERM');
  await Promise.race([exited, new Promise((done) => setTimeout(done, 3_000))]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

async function ready(url, child) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null)
      throw new Error('Local test service stopped before becoming ready');
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
    } catch {
      /* Startup only; no response content is logged. */
    }
    await new Promise((done) => setTimeout(done, 250));
  }
  throw new Error('Local test service readiness timed out');
}

export async function runLocalRecipes() {
  if (process.env.LOCAL_PRODUCTION_RECIPES !== '1')
    throw new Error('Set LOCAL_PRODUCTION_RECIPES=1 explicitly');
  const databaseUrl = assertLocalTestDatabase(process.env.TEST_DATABASE_URL).toString();
  const scope = process.env.LOCAL_RECIPES_SCOPE ?? 'all';
  if (!['all', 'deletion'].includes(scope)) throw new Error('Unknown local recipe scope');
  await access(resolve(webRoot, '.next/BUILD_ID'));
  const webBuildId = (await readFile(resolve(webRoot, '.next/BUILD_ID'), 'utf8')).trim();
  await access(resolve(apiRoot, 'dist/src/app.js'));
  await unusedPort(3007);
  await unusedPort(3008);
  const output = resolve(root, 'tmp/production-remediation');
  await mkdir(output, { recursive: true });
  const runId = randomUUID();
  const counterFile = resolve(output, `fixture-counter-${runId}.json`);
  const authSecret = randomBytes(32).toString('hex');
  const serviceSecret = randomBytes(32).toString('hex');
  const issuedAt = Date.now() - 2_000;
  const identities = ['A', 'B'].map((label) => ({
    label,
    subject: `local-recipes-${runId}-${label}`,
    email: `local-recipes-${runId}-${label}@audit.invalid`,
  }));
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    LOCAL_PRODUCTION_RECIPES: '1',
    DATABASE_URL: databaseUrl,
    TEST_DATABASE_URL: databaseUrl,
    OPENAI_API_KEY: 'local-fixture-no-real-api-key',
    SERVICE_SECRET: serviceSecret,
    AUTH_SECRET: authSecret,
    PRIVACY_REVOCATION_SECRET: randomBytes(32).toString('hex'),
    AUTH_URL: origin,
    NEXTAUTH_URL: origin,
    API_URL: apiOrigin,
    NEXT_PUBLIC_API_URL: apiOrigin,
    AUTH_GOOGLE_ID: 'local-fixture-client',
    AUTH_GOOGLE_SECRET: 'local-fixture-secret',
    FRONTEND_URL: 'https://www.alcideai.fr',
    LOCAL_FIXTURE_COUNTER_FILE: counterFile,
    AI_USER_DAILY_ATTEMPTS: '16',
    AI_GLOBAL_DAILY_ATTEMPTS: '200',
    AI_USER_DAILY_TOKENS: '160000',
    AI_GLOBAL_DAILY_TOKENS: '2000000',
  };
  let api;
  let web;
  let browser;
  let currentPage;
  let detail = 'startup';
  const apiRequests = [];
  let requestBuffer = '';
  const requestSummary = (chunk) => {
    requestBuffer += chunk.toString();
    const blocks = [...requestBuffer.matchAll(/\[Request\] \{([^}]+)\}/g)];
    for (const block of blocks) {
      const method = block[1].match(/method: '(GET|POST|PUT|DELETE|OPTIONS)'/)?.[1];
      const status = Number(block[1].match(/statusCode: (\d+)/)?.[1]);
      if (method && Number.isInteger(status)) apiRequests.push({ method, status });
    }
    if (blocks.length)
      requestBuffer = requestBuffer.slice(blocks.at(-1).index + blocks.at(-1)[0].length);
    if (requestBuffer.length > 8_192) requestBuffer = requestBuffer.slice(-4_096);
  };
  const checks = [];
  const report = {
    runId,
    performedAt: new Date().toISOString(),
    webBuildId,
    mode: 'local-production-synthetic-auth-and-provider',
    scope,
    externalGoogleTested: false,
    realProviderTested: false,
    realProviderCalls: 0,
    checks,
    result: 'failed',
  };
  await writeFile(resolve(output, 'fullstack.json'), `${JSON.stringify(report, null, 2)}\n`, {
    mode: 0o600,
  });
  const { Pool } = apiRequire('pg');
  const pool = new Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 5_000 });
  let currentCheck = 'service_startup';
  const check = async (name, action) => {
    currentCheck = name;
    const started = Date.now();
    await action();
    checks.push({ name, result: 'passed', durationMs: Date.now() - started });
    console.log(JSON.stringify({ check: name, result: 'passed' }));
  };
  try {
    api = start(
      [resolve(apiRoot, 'tests/helpers/local-ai-fixture.mjs'), '--serve'],
      env,
      apiRoot,
      requestSummary,
    );
    await ready(`${apiOrigin}/health/ready`, api);
    web = start(
      [webRequire.resolve('next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', '3007'],
      env,
      webRoot,
    );
    await ready(`${origin}/api/health`, web);
    const { chromium, expect: baseExpect } = webRequire('@playwright/test');
    const expect = baseExpect.configure({ timeout: 15_000 });
    const { encode } = await import('next-auth/jwt');
    browser = await chromium.launch();
    const contexts = [];
    let blockedExternalRequests = 0;
    for (const identity of identities) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await context.route('**/*', async (route) => {
        if (new URL(route.request().url()).origin === origin) await route.continue();
        else {
          blockedExternalRequests += 1;
          await route.abort();
        }
      });
      const cookie = await encode({
        secret: authSecret,
        salt: 'authjs.session-token',
        maxAge: 3_600,
        token: {
          sub: identity.subject,
          userId: identity.subject,
          name: `Recette ${identity.label}`,
          email: identity.email,
          authMethod: 'google',
          identityVersion: 2,
          authIssuedAt: issuedAt,
        },
      });
      await context.addCookies([
        {
          name: 'authjs.session-token',
          value: cookie,
          url: origin,
          httpOnly: true,
          sameSite: 'Lax',
        },
      ]);
      contexts.push(context);
    }
    const page = await contexts[0].newPage();
    currentPage = page;
    let workoutUrl;
    await check('authenticated_workout_generation_via_server_action', async () => {
      await page.goto(`${origin}/generate`);
      await expect(page.getByLabel('Sport', { exact: false }).first()).toBeVisible();
      await page.locator('input[name="sport"]').fill('marche');
      await page.locator('input[name="duration_minutes"]').fill('15');
      await page.locator('textarea[name="goals"]').fill('Pratiquer une activité régulière');
      await page.getByRole('button', { name: 'Generer la seance', exact: true }).click();
      await page.waitForURL(/\/workouts\/[a-f0-9-]{36}$/, { timeout: 30_000 });
      workoutUrl = page.url();
      await expect(
        page.getByRole('heading', { name: 'Séance de recette locale', exact: true }),
      ).toBeVisible();
    });
    await check('persisted_workout_reload_and_two_user_isolation', async () => {
      await page.reload();
      await expect(
        page.getByRole('heading', { name: 'Séance de recette locale', exact: true }),
      ).toBeVisible();
      const other = await contexts[1].newPage();
      await other.goto(workoutUrl);
      await expect(
        other.getByRole('heading', { name: 'Séance de recette locale', exact: true }),
      ).toHaveCount(0);
      const result = await fetch(`${apiOrigin}${new URL(workoutUrl).pathname}`, {
        headers: {
          'x-internal-secret': serviceSecret,
          'x-user-id': identities[1].subject,
          'x-user-email': identities[1].email,
          'x-auth-issued-at': String(issuedAt),
        },
      });
      assert.equal(result.status, 403);
      await other.close();
    });
    await check('timer_journal_and_dashboard', async () => {
      detail = 'start_timer';
      await page.getByRole('button', { name: 'Demarrer', exact: true }).click();
      await page.waitForTimeout(1_100);
      for (let step = 0; step < 8; step += 1) {
        detail = `complete_timer_step_${step}`;
        if (
          await page.getByRole('button', { name: 'Enregistrer le retour', exact: true }).isVisible()
        )
          break;
        const previousTitle = await page.locator('#timer-exercise-title').innerText();
        const finish = page.getByRole('button', { name: 'Terminer', exact: true });
        if (await finish.isVisible()) {
          await finish.click();
          break;
        }
        const skip = page.getByRole('button', { name: /^(Passer|Passer le repos)$/ }).first();
        await skip.click();
        await expect
          .poll(async () => {
            if (
              await page
                .getByRole('button', { name: 'Enregistrer le retour', exact: true })
                .isVisible()
            )
              return true;
            return (await page.locator('#timer-exercise-title').innerText()) !== previousTitle;
          })
          .toBe(true);
      }
      detail = 'show_journal_form';
      await expect(
        page.getByRole('button', { name: 'Enregistrer le retour', exact: true }),
      ).toBeVisible();
      detail = 'submit_journal';
      await page.getByRole('button', { name: 'Enregistrer le retour', exact: true }).click();
      detail = 'confirm_journal_saved';
      await expect(page.getByText('Retour enregistre.', { exact: true })).toBeVisible();
      detail = 'verify_journal_in_postgresql';
      const result = await pool.query(
        'select count(*)::int as count from session_logs l join users u on u.id=l.user_id where u.email=$1',
        [identities[0].email],
      );
      assert.equal(result.rows[0].count, 1);
      await page.goto(`${origin}/dashboard`);
      detail = 'show_dashboard';
      await expect(
        page.getByRole('heading', { name: 'Votre progression', exact: true }),
      ).toBeVisible();
    });
    if (scope === 'all')
      await check('two_week_program_generation_and_reload', async () => {
        await page.goto(`${origin}/programs/generate`);
        await page.locator('input[name="sport"]').fill('marche');
        await page.locator('select[name="weeks_count"]').selectOption('2');
        await page.locator('select[name="sessions_per_week"]').selectOption('2');
        await page.locator('select[name="session_duration_minutes"]').selectOption('20');
        await page.locator('textarea[name="goals"]').fill('Pratiquer une activité régulière');
        await page.getByRole('button', { name: 'Generer le programme', exact: true }).click();
        await page.waitForURL(/\/programs\/[a-f0-9-]{36}$/, { timeout: 30_000 });
        await page.reload();
        await expect(page.getByRole('heading', { level: 1 })).toContainText(
          'Programme Alcide marche',
        );
        const result = await pool.query(
          'select p.weeks_count,p.data from training_programs p join users u on u.id=p.user_id where u.email=$1',
          [identities[0].email],
        );
        assert.equal(result.rows.length, 1);
        assert.equal(result.rows[0].weeks_count, 2);
        assert.equal(result.rows[0].data.weeks.length, 2);
      });
    if (scope === 'all')
      await check('provider_failure_keeps_form_and_does_not_save_a_workout', async () => {
        detail = 'open_failure_form';
        await page.goto(`${origin}/generate`);
        await page.locator('input[name="sport"]').fill('marche');
        await page.locator('textarea[name="goals"]').fill('fixture-indisponible');
        await page.getByRole('button', { name: 'Generer la seance', exact: true }).click();
        detail = 'announce_provider_failure';
        await expect(
          page.locator('form[aria-labelledby="form-title"]').getByRole('alert'),
        ).toContainText('ne peut pas générer', { timeout: 30_000 });
        await expect(page.locator('textarea[name="goals"]')).toHaveValue('fixture-indisponible');
        detail = 'verify_failure_did_not_persist';
        const result = await pool.query(
          'select count(*)::int as count from workouts w join users u on u.id=w.user_id where u.email=$1',
          [identities[0].email],
        );
        assert.equal(result.rows[0].count, 1);
      });
    await check('workout_deletion_and_logout_protects_private_routes', async () => {
      detail = 'open_workout_history';
      await page.goto(`${origin}/workouts`);
      const card = page.getByRole('article').filter({ hasText: 'Séance de recette locale' });
      detail = 'confirm_workout_deletion';
      await page
        .getByRole('button', { name: /Supprimer l.entraînement : Séance de recette locale/ })
        .click();
      await page.getByRole('button', { name: 'Confirmer', exact: true }).click();
      // The initial delete button is absent while confirmation is pending too.
      // Wait for the actual article to disappear after the server action commits.
      detail = 'wait_for_deleted_article';
      await expect(card).toHaveCount(0);
      detail = 'verify_deletion_in_postgresql';
      const result = await pool.query(
        'select count(*)::int as count from workouts w join users u on u.id=w.user_id where u.email=$1',
        [identities[0].email],
      );
      assert.equal(result.rows[0].count, 0);
      detail = 'logout';
      await page.getByRole('button', { name: 'Se deconnecter', exact: true }).click();
      await page.waitForURL(`${origin}/`);
      await page.goto(`${origin}/generate`);
      detail = 'private_route_after_logout';
      await page.waitForURL(/\/login(?:\?|$)/);
    });
    const counters = JSON.parse(await readFile(counterFile, 'utf8'));
    assert.equal(counters.attempts, scope === 'all' ? 5 : 1);
    assert.equal(counters.simulatedFailures, scope === 'all' ? 2 : 0);
    report.providerFixture = counters;
    report.blockedExternalRequests = blockedExternalRequests;
    report.result = 'passed';
  } catch (error) {
    // Select only the assertion category; Playwright errors can contain DOM data.
    report.failure = {
      category: error instanceof Error ? error.name : 'UnknownError',
      check: currentCheck,
      detail,
      reason: /strict mode violation/i.test(error.message ?? '')
        ? 'locator_not_unique'
        : /timeout|timed out/i.test(error.message ?? '')
          ? 'timeout'
          : 'assertion_failed',
    };
    if (currentPage) {
      report.failure.ui = await currentPage
        .evaluate(() => ({
          timerCompleted: Boolean(document.getElementById('session-complete-title')),
          journalSaved: document.body.textContent?.includes('Retour enregistre.') ?? false,
          controls: Array.from(document.querySelectorAll('button'))
            .map((button) => button.textContent?.trim())
            .filter((text) =>
              [
                'Demarrer',
                'Pause',
                'Passer',
                'Passer le repos',
                'Terminer',
                'Enregistrer le retour',
                'Sauvegarde',
                'Supprimer',
                'Confirmer',
                'Annuler',
                'Suppression...',
              ].includes(text),
            ),
        }))
        .catch(() => null);
    }
    report.failure.apiRequests = apiRequests;
    report.failure.databaseCounts =
      (
        await pool.query(
          `select
      (select count(*)::int from workouts where user_id=u.id) as workouts,
      (select count(*)::int from session_logs where user_id=u.id) as logs,
      (select count(*)::int from training_programs where user_id=u.id) as programs
      from users u where email=$1`,
          [identities[0].email],
        )
      ).rows[0] ?? null;
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    await stop(web);
    await stop(api);
    try {
      await pool.query('delete from users where email = any($1::text[])', [
        identities.map((item) => item.email),
      ]);
      const leftovers = await pool.query(
        'select count(*)::int as count from users where email = any($1::text[])',
        [identities.map((item) => item.email)],
      );
      report.cleanedSyntheticUsers = leftovers.rows[0].count === 0;
      if (!report.cleanedSyntheticUsers) throw new Error('Synthetic cleanup incomplete');
    } catch {
      report.cleanedSyntheticUsers = false;
      report.result = 'failed';
      report.failure = { category: 'CleanupError', check: 'remove_only_owned_synthetic_users' };
      process.exitCode = 1;
    }
    await pool.end().catch(() => undefined);
    await writeFile(resolve(output, 'fullstack.json'), `${JSON.stringify(report, null, 2)}\n`, {
      mode: 0o600,
    });
  }
  console.log(JSON.stringify(report));
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runLocalRecipes().catch(() => {
    console.error('Local recipe prerequisites or cleanup failed; no private diagnostics exported');
    process.exitCode = 1;
  });
}
