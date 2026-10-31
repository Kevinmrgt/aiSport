import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertLocalTestDatabase } from '../apps/api/tests/helpers/local-ai-fixture.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const webRoot = resolve(root, 'apps/web');
const apiRoot = resolve(root, 'apps/api');
const webRequire = createRequire(resolve(webRoot, 'package.json'));
const apiRequire = createRequire(resolve(apiRoot, 'package.json'));
const origin = 'http://127.0.0.1:3007';
const apiOrigin = 'http://127.0.0.1:3008';

async function requireFreePort(port) {
  const probe = createServer();
  await new Promise((done, reject) => {
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', done);
  });
  await new Promise((done) => probe.close(done));
}
function start(args, env, cwd) {
  const child = spawn(process.execPath, args, {
    cwd,
    env,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // Drain without retaining raw logs, sessions, exception text or response bodies.
  child.stdout.resume();
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
    if (child.exitCode !== null) throw new Error('Local service stopped before readiness');
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(2_000) })).ok) return;
    } catch {
      /* Bounded local startup only. */
    }
    await new Promise((done) => setTimeout(done, 250));
  }
  throw new Error('Local service readiness timed out');
}

export async function runLocalIncidentRecipe() {
  if (process.env.LOCAL_INCIDENT_RECIPES !== '1')
    throw new Error('Explicit local incident recipe activation required');
  const databaseUrl = assertLocalTestDatabase(process.env.TEST_DATABASE_URL).toString();
  await requireFreePort(3007);
  await requireFreePort(3008);
  const runId = randomUUID();
  const output = resolve(root, 'tmp/admin-incidents');
  await mkdir(output, { recursive: true });
  const authSecret = randomBytes(32).toString('hex');
  const serviceSecret = randomBytes(32).toString('hex');
  const identities = ['admin', 'member'].map((role) => ({
    role,
    subject: `incident-recipe-${runId}-${role}`,
    email: `incident-recipe-${runId}-${role}@audit.invalid`,
  }));
  const issuedAt = Date.now() - 2_000;
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    LOCAL_PRODUCTION_RECIPES: '1',
    TEST_DATABASE_URL: databaseUrl,
    DATABASE_URL: databaseUrl,
    OPENAI_API_KEY: 'local-fixture-no-real-api-key',
    SERVICE_SECRET: serviceSecret,
    AUTH_SECRET: authSecret,
    AUTH_GOOGLE_ID: 'local-fixture-client',
    AUTH_GOOGLE_SECRET: 'local-fixture-secret',
    PRIVACY_REVOCATION_SECRET: randomBytes(32).toString('hex'),
    NEXTAUTH_URL: origin,
    AUTH_URL: origin,
    API_URL: apiOrigin,
    NEXT_PUBLIC_API_URL: apiOrigin,
    FRONTEND_URL: 'https://www.alcideai.fr',
    PRODUCTION_ACCESS_MODE: 'public',
    ADMIN_EMAILS: identities[0].email,
    AI_USER_DAILY_ATTEMPTS: '16',
    AI_GLOBAL_DAILY_ATTEMPTS: '200',
    AI_USER_DAILY_TOKENS: '160000',
    AI_GLOBAL_DAILY_TOKENS: '2000000',
  };
  const { Pool } = apiRequire('pg');
  const pool = new Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 5_000 });
  const report = {
    runId,
    performedAt: new Date().toISOString(),
    mode: 'local-compiled-synthetic-sessions-and-provider',
    realProviderCalls: 0,
    externalGoogleTested: false,
    checks: [],
    result: 'failed',
  };
  let page;
  let api,
    web,
    browser,
    phase = 'startup';
  const incidentIds = new Set();
  const headers = (identity = identities[0]) => ({
    'content-type': 'application/json',
    'x-internal-secret': serviceSecret,
    'x-user-id': identity.subject,
    'x-user-email': identity.email,
    'x-email-verified': 'true',
    'x-auth-issued-at': String(issuedAt),
  });
  const request = (path, options = {}, identity) =>
    fetch(`${apiOrigin}${path}`, {
      ...options,
      headers: { ...headers(identity), ...options.headers },
      signal: AbortSignal.timeout(20_000),
    });
  const incidents = async (source) => {
    const response = await request(`/admin/incidents?page=1&source=${source}`);
    assert.equal(response.status, 200);
    const result = await response.json();
    for (const item of result.items) incidentIds.add(item.id);
    return result.items;
  };
  async function check(name, action) {
    phase = name;
    await action();
    report.checks.push({ name, result: 'passed' });
    console.log(JSON.stringify({ check: name, result: 'passed' }));
  }
  try {
    const baseline = await pool.query('SELECT count(*)::integer AS total FROM incidents');
    assert.equal(
      baseline.rows[0].total,
      0,
      'An empty incident journal on a dedicated test database is required',
    );
    api = start([resolve(apiRoot, 'tests/helpers/local-ai-fixture.mjs'), '--serve'], env, apiRoot);
    await ready(`${apiOrigin}/health/ready`, api);
    web = start(
      [webRequire.resolve('next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', '3007'],
      env,
      webRoot,
    );
    await ready(`${origin}/api/health`, web);
    const { chromium, expect: baseExpect } = webRequire('@playwright/test');
    const expect = baseExpect.configure({ timeout: 15_000 });
    const { encode } = await import(pathToFileURL(webRequire.resolve('next-auth/jwt')).href);
    browser = await chromium.launch();
    const contexts = [];
    for (const identity of identities) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      await context.route('**/*', async (route) => {
        if (new URL(route.request().url()).origin === origin) await route.continue();
        else await route.abort();
      });
      const cookie = await encode({
        secret: authSecret,
        salt: 'authjs.session-token',
        maxAge: 3600,
        token: {
          sub: identity.subject,
          userId: identity.subject,
          name: 'Recette incidents',
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
    page = await contexts[0].newPage();
    await check('access_admin_only_and_same_origin', async () => {
      phase = 'access_api_anonymous';
      assert.equal((await fetch(`${apiOrigin}/admin/incidents`)).status, 401);
      phase = 'access_api_member';
      assert.equal((await request('/admin/incidents', {}, identities[1])).status, 403);
      phase = 'access_api_member_mutation';
      assert.equal(
        (
          await request(
            `/admin/incidents/${randomUUID()}`,
            { method: 'PATCH', body: JSON.stringify({ status: 'resolved' }) },
            identities[1],
          )
        ).status,
        403,
      );
      phase = 'access_foreign_origin';
      const foreign = await contexts[0].request.post(`${origin}/api/incidents`, {
        headers: { origin: 'https://foreign.invalid' },
        data: { kind: 'unhandled_error', path: '/' },
      });
      assert.equal(foreign.status(), 403);
      const anonymous = await browser.newContext();
      try {
        phase = 'access_anonymous_browser_ingestion';
        const response = await anonymous.request.post(`${origin}/api/incidents`, {
          headers: { origin },
          data: { kind: 'unhandled_error', path: '/' },
        });
        report.lastResponseStatus = response.status();
        assert.equal(response.status(), 401);
        phase = 'access_anonymous_admin_redirect';
        const anonymousPage = await anonymous.newPage();
        await anonymousPage.goto(`${origin}/admin/erreurs`);
        await expect(anonymousPage).toHaveURL(/\/login(?:\?|$)/);
      } finally {
        await anonymous.close();
      }
      phase = 'access_member_admin_redirect';
      const memberPage = await contexts[1].newPage();
      await memberPage.goto(`${origin}/admin/erreurs`);
      await expect(memberPage).toHaveURL(/\/dashboard$/);
      await memberPage.close();
    });
    await check('browser_collector_deduplicates_without_private_details', async () => {
      await page.goto(`${origin}/admin/erreurs`);
      await expect(
        page.getByRole('heading', { name: 'Erreurs et incidents', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Erreurs et incidents', exact: true }).first(),
      ).toBeVisible();
      await page.evaluate(() => {
        history.replaceState(null, '', '/admin/erreurs?private=fixture-private-query');
        for (let i = 0; i < 2; i++)
          window.dispatchEvent(
            new ErrorEvent('error', {
              message: `fixture-private-message-${i}`,
              filename: 'https://private.invalid/private.js',
              error: new Error('fixture-private-exception'),
            }),
          );
      });
      await expect
        .poll(
          async () =>
            (await incidents('web')).find((item) => item.route === '/admin/erreurs')
              ?.occurrenceCount,
        )
        .toBe(1);
      const data = (await incidents('web')).find((item) => item.route === '/admin/erreurs');
      assert.equal(data.code, 'WEB_UNHANDLED_ERROR');
      assert.equal(data.status, 'new');
      assert.ok(!JSON.stringify(data).includes('fixture-private'));
      assert.ok(!JSON.stringify(data).includes('private.invalid'));
      const rejected = await contexts[0].request.post(`${origin}/api/incidents`, {
        headers: { origin },
        data: { kind: 'unhandled_error', path: '/', message: 'fixture-private-extra' },
      });
      assert.equal(rejected.status(), 400);
    });
    await check('filter_status_change_and_recurrence_in_real_admin', async () => {
      phase = 'admin_filter_control';
      await page.goto(`${origin}/admin/erreurs?source=web`);
      await expect(page.getByLabel('Origine', { exact: true })).toHaveValue('web');
      phase = 'admin_incident_row';
      const row = page.getByRole('row').filter({ hasText: 'WEB_UNHANDLED_ERROR' });
      await expect(row).toHaveCount(1);
      phase = 'admin_status_form';
      await row.getByRole('combobox').selectOption('resolved');
      await row.getByRole('button', { name: 'Enregistrer le statut', exact: true }).click();
      phase = 'admin_status_persistence';
      await expect
        .poll(
          async () =>
            (await incidents('web')).find((item) => item.route === '/admin/erreurs')?.status,
        )
        .toBe('resolved');
      phase = 'admin_recurrence';
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.evaluate(() =>
        window.dispatchEvent(new ErrorEvent('error', { message: 'fixture-private-recurrence' })),
      );
      await expect
        .poll(
          async () =>
            (await incidents('web')).find((item) => item.route === '/admin/erreurs')?.status,
        )
        .toBe('new');
      assert.equal(
        (await incidents('web')).find((item) => item.route === '/admin/erreurs').occurrenceCount,
        2,
      );
    });
    await check('provider_failure_persists_and_ordinary_validation_does_not', async () => {
      const response = await request('/workouts/generate', {
        method: 'POST',
        body: JSON.stringify({
          sport: 'running',
          level: 'beginner',
          duration_minutes: 30,
          goals: 'fixture-indisponible',
          constraints: 'fixture-private-constraint',
        }),
        headers: { 'idempotency-key': randomUUID() },
      });
      assert.ok(response.status >= 500 && response.status <= 599);
      await expect
        .poll(async () =>
          (await incidents('ai')).some((item) => item.route === '/workouts/generate'),
        )
        .toBe(true);
      const aiIncidents = await incidents('ai');
      const serialized = JSON.stringify(aiIncidents);
      assert.ok(!serialized.includes('fixture-indisponible'));
      assert.ok(!serialized.includes('fixture-private-constraint'));
      assert.ok(!serialized.includes(identities[0].email));
      const countBefore = aiIncidents.reduce((total, item) => total + item.occurrenceCount, 0);
      assert.equal(
        (await request('/workouts/generate', { method: 'POST', body: '{}' })).status,
        400,
      );
      assert.equal(
        (await incidents('ai')).reduce((total, item) => total + item.occurrenceCount, 0),
        countBefore,
      );
    });
    await check('desktop_mobile_and_keyboard_admin', async () => {
      await page.goto(`${origin}/admin/erreurs`);
      await expect(page.getByRole('row').filter({ hasText: 'WEB_UNHANDLED_ERROR' })).toBeVisible();
      await page.screenshot({ path: resolve(output, 'desktop.png'), fullPage: true });
      await page.getByLabel('Origine', { exact: true }).focus();
      await page.keyboard.press('Tab');
      await expect(page.getByLabel('Gravité', { exact: true })).toBeFocused();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: resolve(output, 'mobile.png'), fullPage: true });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      assert.equal(overflow, false);
    });
    report.result = 'passed';
  } catch (error) {
    report.failedPhase = phase;
    report.failureKind = error instanceof assert.AssertionError ? 'assertion' : 'execution';
    if (phase === 'admin_filter_control' && page) {
      report.sourceControlCount = await page.locator('select[name="source"]').count();
      report.sourceLabelCount = await page.getByLabel('Origine', { exact: true }).count();
    }
    if (page)
      await page
        .screenshot({ path: resolve(output, 'failed.png'), fullPage: true })
        .catch(() => undefined);
    // Only a stable phase is exported; errors can include SQL or session details.
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    await stop(web);
    await stop(api);
    try {
      // This script is explicitly restricted to an isolated local test database.
      if (incidentIds.size)
        await pool.query('DELETE FROM incidents WHERE id = ANY($1::uuid[])', [[...incidentIds]]);
      await pool.query('DELETE FROM users WHERE email = ANY($1::text[])', [
        identities.map((item) => item.email),
      ]);
      await pool.query('DELETE FROM admin_audit_events WHERE actor_email = $1', [
        identities[0].email,
      ]);
      report.fixturesCleaned = true;
    } catch {
      report.fixturesCleaned = false;
      process.exitCode = 1;
    }
    await pool.end();
    await writeFile(resolve(output, 'recipe.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report));
  }
  return report;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runLocalIncidentRecipe().catch(() => {
    console.error('Local incident recipe failed before execution; no private diagnostics exported');
    process.exitCode = 1;
  });
}
