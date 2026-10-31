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

export function recipeDatabaseEnvironment(value) {
  const target = assertLocalTestDatabase(value);
  if (target.pathname !== '/alcide_audit' || target.search || target.hash)
    throw new Error(
      'Recipes require the dedicated local alcide_audit database without URL overrides',
    );
  const databaseUrl = target.toString();
  return {
    DATABASE_URL: databaseUrl,
    ALCIDE_DATABASE_URL: databaseUrl,
    TEST_DATABASE_URL: databaseUrl,
  };
}

export async function assertFreshRecipeDatabase(pool) {
  const state = (
    await pool.query(`select
    (select count(*)::int from users) as users,
    (select count(*)::int from generation_operations) as operations,
    (select count(*)::int from generation_daily_budgets) as budgets,
    (select count(*)::int from pilot_control) as controls,
    (select count(*)::int from pilot_invitations) as invitations,
    (select count(*)::int from pilot_admissions) as admissions,
    (select count(*)::int from pilot_attempts) as attempts`)
  ).rows[0];
  assert.ok(
    state &&
      ['users', 'operations', 'budgets', 'controls', 'invitations', 'admissions', 'attempts'].every(
        (key) => state[key] === 0,
      ),
    'Recipes require a fresh isolated database; existing pilot history cannot be reset',
  );
}

async function pilotFixtureAction(env, action, { reviewReference, userId } = {}) {
  recipeDatabaseEnvironment(env.TEST_DATABASE_URL);
  assert.equal(env.DATABASE_URL, env.TEST_DATABASE_URL);
  assert.equal(env.ALCIDE_DATABASE_URL, env.TEST_DATABASE_URL);
  assert.equal(env.LOCAL_PRODUCTION_RECIPES, '1');
  assert.equal(env.OPENAI_API_KEY, 'local-fixture-no-real-api-key');
  assert.ok(['enable-generation', 'activate', 'invite'].includes(action));
  const repositoryUrl = pathToFileURL(
    resolve(apiRoot, 'dist/src/repositories/pilot.repository.js'),
  ).href;
  const databaseModule = pathToFileURL(resolve(apiRoot, 'dist/src/db/index.js')).href;
  const review = {
    reviewer: 'synthetic-local-browser-recipe',
    reviewReference,
    legacyProvisionsReviewed: true,
    providerBalanceReviewed: true,
    allGenerationPathsReviewed: true,
    legacyNanoUsd: 0,
  };
  const budgetUrl = pathToFileURL(
    resolve(apiRoot, 'dist/src/repositories/generation-budget.repository.js'),
  ).href;
  const work =
    action === 'enable-generation'
      ? `const {GenerationBudgetRepository}=await import(${JSON.stringify(budgetUrl)});await new GenerationBudgetRepository().setEnabled(true);`
      : action === 'activate'
        ? `await pilot.activate(${JSON.stringify(review)});`
        : `await pilot.invite(${JSON.stringify(userId)});`;
  const code = `const {PilotRepository}=await import(${JSON.stringify(repositoryUrl)});const {pool}=await import(${JSON.stringify(databaseModule)});try{const pilot=new PilotRepository();${work}}finally{await pool.end();}`;
  const child = start(['--input-type=module', '-e', code], env, apiRoot);
  const [exit] = await once(child, 'exit');
  assert.equal(exit, 0, 'Explicit synthetic pilot operation failed');
}

export function recipeRouteCategory(path) {
  const route = String(path ?? '').split('?')[0];
  if (route === '/workouts') return 'workout_history';
  if (/^\/workouts\/[a-f0-9-]{36}$/.test(route)) return 'workout_detail';
  if (route === '/programs') return 'program_history';
  if (/^\/programs\/[a-f0-9-]{36}$/.test(route)) return 'program_detail';
  if (route === '/session-logs') return 'session_logs';
  return 'other';
}

export function summarizeRecipeFlight({ method, status, contentType, body }) {
  // Never retain the Flight body, headers, action identifiers, URLs or account data.
  return {
    method: ['GET', 'POST'].includes(method) ? method : 'other',
    status: Number.isInteger(status) ? status : 0,
    flight: typeof contentType === 'string' && contentType.includes('text/x-component'),
    fixtureWorkoutPresent: typeof body === 'string' && body.includes('Séance de recette locale'),
    emptyWorkoutHistoryPresent:
      typeof body === 'string' &&
      (body.includes('Aucune séance') || body.includes('Aucune seance')),
  };
}

export function recipeBrowserErrorCategory(message) {
  const text = String(message ?? '');
  if (/content security policy|\bcsp\b|nonce/i.test(text)) return 'csp';
  if (/hydration|hydrating/i.test(text)) return 'hydration';
  if (/server components render|server action|failed to find server action/i.test(text))
    return 'server_render_or_action';
  if (/failed to fetch|networkerror|network error/i.test(text)) return 'network';
  return 'other';
}

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
  const databaseEnvironment = recipeDatabaseEnvironment(process.env.TEST_DATABASE_URL);
  const databaseUrl = databaseEnvironment.TEST_DATABASE_URL;
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
  const reviewReference = `synthetic-local-browser-recipe:${runId}`;
  await writeFile(counterFile, JSON.stringify({ attempts: 0, simulatedFailures: 0 }), {
    flag: 'wx',
    mode: 0o600,
  });
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
    ...databaseEnvironment,
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
    PRODUCTION_ACCESS_MODE: 'public',
    ADMIN_EMAILS: identities[0].email,
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
  const historyResponses = [];
  const browserErrors = [];
  const responseTasks = new Set();
  const diagnosticStarted = Date.now();
  let requestBuffer = '';
  const requestSummary = (chunk) => {
    requestBuffer += chunk.toString();
    const blocks = [...requestBuffer.matchAll(/\[Request\] \{([^}]+)\}/g)];
    for (const block of blocks) {
      const method = block[1].match(/method: '(GET|POST|PUT|DELETE|OPTIONS)'/)?.[1];
      const status = Number(block[1].match(/statusCode: (\d+)/)?.[1]);
      if (method && Number.isInteger(status))
        apiRequests.push({ method, status, atMs: Date.now() - diagnosticStarted });
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
    await check('dedicated_database_starts_without_users_or_pilot_history', () =>
      assertFreshRecipeDatabase(pool),
    );
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
          googleEmailVerified: true,
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
    page.on('console', (message) => {
      if (
        (message.type() === 'error' ||
          /SERVER ACTION APPLY FAILED|SEGMENT MISMATCH/.test(message.text())) &&
        browserErrors.length < 50
      ) {
        browserErrors.push({
          category: recipeBrowserErrorCategory(message.text()),
          atMs: Date.now() - diagnosticStarted,
        });
      }
    });
    page.on('pageerror', (error) => {
      if (browserErrors.length < 50)
        browserErrors.push({
          category: recipeBrowserErrorCategory(error.message),
          atMs: Date.now() - diagnosticStarted,
        });
    });
    page.on('response', (response) => {
      const url = new URL(response.url());
      if (
        url.origin !== origin ||
        recipeRouteCategory(url.pathname) !== 'workout_history' ||
        historyResponses.length >= 50
      )
        return;
      const entry = {
        phase: currentCheck,
        detail,
        receivedAtMs: Date.now() - diagnosticStarted,
        method: response.request().method(),
        status: response.status(),
      };
      historyResponses.push(entry);
      const task = (async () => {
        Object.assign(
          entry,
          summarizeRecipeFlight({
            method: response.request().method(),
            status: response.status(),
            contentType: await response.headerValue('content-type'),
            body: await response.text(),
          }),
        );
      })().catch(() => {
        entry.readFailed = true;
      });
      responseTasks.add(task);
      void task.finally(() => responseTasks.delete(task));
    });
    await check('september_home_offers_navigation_and_admin', async () => {
      const anonymous = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const publicPage = await anonymous.newPage();
      await publicPage.goto(origin);
      await expect(
        publicPage.getByRole('heading', { level: 1, name: 'Créer une séance' }),
      ).toBeVisible();
      await publicPage.screenshot({
        path: resolve(output, 'restored-fd-home-local.png'),
        fullPage: true,
      });
      const navigation = publicPage.getByRole('navigation', { name: 'Navigation principale' });
      await expect(navigation.getByRole('link', { name: 'Les offres' })).toHaveAttribute(
        'href',
        '/tarifs',
      );
      await navigation.getByRole('link', { name: 'Les offres' }).click();
      await expect(publicPage.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(publicPage.getByText(/^5\s*€$/).first()).toBeVisible();
      await publicPage.goto(`${origin}/abonnement`);
      await expect(publicPage.getByText(/souscriptions restent fermées/)).toBeVisible();
      await publicPage.goto(`${origin}/admin`);
      await publicPage.waitForURL(/\/login(?:\?|$)/);
      await anonymous.close();
      await page.goto(`${origin}/admin`);
      await expect(page.getByRole('navigation', { name: /administration/i })).toBeVisible();
      await page.screenshot({
        path: resolve(output, 'restored-fd-admin-local.png'),
        fullPage: true,
      });
      await expect(page.getByRole('link', { name: 'Tous les membres' }).first()).toHaveAttribute(
        'href',
        '/admin/membres',
      );
      await expect(
        page.getByRole('link', { name: 'Abonnements', exact: true }).first(),
      ).toHaveAttribute('href', '/admin/abonnements');
      const memberContext = contexts[1];
      const memberPage = await memberContext.newPage();
      await memberPage.goto(`${origin}/admin`);
      await memberPage.waitForURL(/\/dashboard$/);
      await memberPage.close();
      const fixtureUser = await pool.query('select id from users where email=$1', [
        identities[0].email,
      ]);
      assert.equal(fixtureUser.rows.length, 1);
      const grant = await fetch(`${apiOrigin}/admin/members/${fixtureUser.rows[0].id}/credits`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-secret': serviceSecret,
          'x-user-id': identities[0].subject,
          'x-user-email': identities[0].email,
          'x-email-verified': 'true',
          'x-auth-issued-at': String(issuedAt),
        },
        body: JSON.stringify({
          amount: 10,
          reason: 'Recette locale isolée',
          requestId: randomUUID(),
        }),
      });
      assert.equal(grant.status, 200);
      await page.goto(`${origin}/abonnement`);
      await expect(page.getByRole('button', { name: /^Passer à Premium/ })).toHaveCount(0);
    });
    await check(
      'closed_pilot_blocks_calls_until_explicit_synthetic_activation_and_invitation',
      async () => {
        detail = 'verify_closed_before_activation';
        const generate = (identity) =>
          fetch(`${apiOrigin}/workouts/generate`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-internal-secret': serviceSecret,
              'x-user-id': identity.subject,
              'x-user-email': identity.email,
              'x-email-verified': 'true',
              'x-auth-issued-at': String(issuedAt),
              'idempotency-key': randomUUID(),
            },
            body: JSON.stringify({
              sport: 'marche',
              level: 'beginner',
              duration_minutes: 15,
              goals: 'Recette locale sans appel fournisseur avant admission',
            }),
          });
        assert.equal((await generate(identities[0])).status, 503);
        assert.equal(JSON.parse(await readFile(counterFile, 'utf8')).attempts, 0);
        detail = 'enable_only_legacy_test_kill_switch_with_pilot_still_closed';
        await pilotFixtureAction(env, 'enable-generation');
        const closed = await generate(identities[0]);
        assert.equal(closed.status, 503);
        assert.equal(
          (await closed.json()).message,
          'Le pilote IA est ferme ou sa comptabilite requiert une verification',
        );
        assert.equal(JSON.parse(await readFile(counterFile, 'utf8')).attempts, 0);
        detail = 'activate_synthetic_pilot';
        await pilotFixtureAction(env, 'activate', { reviewReference });
        detail = 'verify_uninvited_account';
        const uninvited = await generate(identities[1]);
        const rejection = await uninvited.json();
        report.uninvitedGate = {
          status: uninvited.status,
          invitationRequired: rejection.error === 'PILOT_INVITATION_REQUIRED',
          accountingUnavailable:
            rejection.message ===
            'La reservation de generation est indisponible. Aucun appel IA ne peut etre lance.',
          pilotClosed:
            rejection.message ===
            'Le pilote IA est ferme ou sa comptabilite requiert une verification',
        };
        assert.equal(uninvited.status, 403);
        assert.equal(rejection.error, 'PILOT_INVITATION_REQUIRED');
        assert.equal(JSON.parse(await readFile(counterFile, 'utf8')).attempts, 0);
        const admissions = await pool.query('select count(*)::int as count from pilot_admissions');
        assert.equal(admissions.rows[0].count, 0);
        detail = 'invite_only_owned_synthetic_account';
        const user = await pool.query('select id from users where email=$1', [identities[0].email]);
        assert.equal(user.rows.length, 1);
        await pilotFixtureAction(env, 'invite', { userId: user.rows[0].id });
        report.explicitSyntheticPilotActivated = true;
        report.onlyOwnedSyntheticUserInvited = true;
      },
    );
    let workoutUrl;
    await check('authenticated_workout_generation_via_server_action', async () => {
      await page.goto(`${origin}/generate`);
      await expect(page.getByLabel('Sport', { exact: false }).first()).toBeVisible();
      await page.locator('input[name="sport"]').fill('marche');
      await page.locator('input[name="duration_minutes"]').fill('15');
      await page.locator('textarea[name="goals"]').fill('Pratiquer une activité régulière');
      await page.getByRole('button', { name: 'Générer la séance', exact: true }).click();
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
          'x-email-verified': 'true',
          'x-auth-issued-at': String(issuedAt),
        },
      });
      assert.equal(result.status, 403);
      await other.close();
    });
    await check('timer_journal_and_dashboard', async () => {
      detail = 'start_timer';
      await page.getByRole('button', { name: 'Démarrer', exact: true }).click();
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
      await expect(page.getByText('Retour enregistré.', { exact: true })).toBeVisible();
      detail = 'verify_journal_in_postgresql';
      const result = await pool.query(
        'select count(*)::int as count from session_logs l join users u on u.id=l.user_id where u.email=$1',
        [identities[0].email],
      );
      assert.equal(result.rows[0].count, 1);
      await page.goto(`${origin}/dashboard`);
      detail = 'show_dashboard';
      await expect(
        page.getByRole('heading', { name: 'Ma progression', exact: true }),
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
        await page.getByRole('button', { name: 'Générer le programme', exact: true }).click();
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
        await page.getByRole('button', { name: 'Générer la séance', exact: true }).click();
        detail = 'announce_provider_failure';
        await expect(
          page.locator('form[aria-labelledby="form-title"]').getByRole('alert'),
        ).toContainText('Alcide n’a pas réussi à finaliser cette séance.', { timeout: 30_000 });
        await expect(page.locator('form[aria-labelledby="form-title"]')).toBeVisible();
        await expect(page.locator('input[name="sport"]')).toHaveValue('marche');
        await expect(
          page.getByRole('button', { name: 'Générer la séance', exact: true }),
        ).toBeEnabled();
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
      await currentPage
        .screenshot({ path: resolve(root, 'tmp/fd-local-failure.png'), fullPage: true })
        .catch(() => undefined);
      report.failure.ui = await currentPage
        .evaluate(() => ({
          generationFormPresent: Boolean(
            document.querySelector('form[aria-labelledby="form-title"]'),
          ),
          generationPending: Boolean(document.getElementById('generation-heading')),
          failureGoalRetained:
            document.querySelector('textarea[name="goals"]')?.value === 'fixture-indisponible',
          generationFailureAlertPresent: Array.from(
            document.querySelectorAll('[role="alert"]'),
          ).some((alert) => alert.textContent?.includes('n’a pas réussi à finaliser cette séance')),
          timerCompleted: Boolean(document.getElementById('session-complete-title')),
          journalSaved: document.body.textContent?.includes('Retour enregistré.') ?? false,
          articleCount: document.querySelectorAll('[role="article"]').length,
          fixtureWorkoutPresent:
            document.body.textContent?.includes('Séance de recette locale') ?? false,
          emptyWorkoutHistoryPresent:
            document.body.textContent?.includes('Aucune seance pour l instant') ?? false,
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
    await Promise.race([
      Promise.allSettled([...responseTasks]),
      new Promise((done) => setTimeout(done, 2_000)),
    ]);
    report.diagnostics = { historyResponses, browserErrors };
    if (browser) await browser.close().catch(() => undefined);
    await stop(web);
    await stop(api);
    try {
      await pool.query('update pilot_control set enabled=false where review_reference=$1', [
        reviewReference,
      ]);
      const pilot = await pool.query(
        'select enabled from pilot_control where review_reference=$1',
        [reviewReference],
      );
      report.syntheticPilotInactiveAfterCleanup = pilot.rows.every((row) => row.enabled === false);
      assert.equal(report.syntheticPilotInactiveAfterCleanup, true);
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
