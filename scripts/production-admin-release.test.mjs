import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { VercelProduction, validateReleaseInput, directSourceUrl, inspectConfiguration, runProductionAdminRelease, requireSuccessfulCi, deployClosedProduction, checkUnauthenticatedApiDenied } from './production-admin-release.mjs';

const revision = 'a'.repeat(40);
const privateAdminId = 'd72a58b7-6d4f-4187-90f7-9c763cfe2975';
const service = 'q1W2e3R4t5Y6u7I8o9P0aSbDcFgHjKlZ';
const auth = 'z1X2c3V4b5N6m7A8s9D0fGhJkLqWeRtY';
const env = { RELEASE_MODE: 'plan', RELEASE_REVISION: revision, TARGET_DATABASE_NAME: 'alcide_admin_test',
  BOOTSTRAP_ADMIN_EMAIL: 'admin@example.test', VERCEL_TOKEN: 'private-provider-token', VERCEL_ORG_ID: 'team_fixture',
  VERCEL_API_PROJECT_ID: 'api', VERCEL_WEB_PROJECT_ID: 'web' };
const source = 'postgresql://private_user:private_password@db.example.test/legacy?sslmode=require';
const configuration = () => ({
  api: { DATABASE_URL: { value: source }, SERVICE_SECRET: { value: service } },
  web: { SERVICE_SECRET: { value: service }, AUTH_SECRET: { value: auth }, AUTH_GOOGLE_ID: { value: 'google-fixture' }, AUTH_GOOGLE_SECRET: { value: 'oauth-private-value' } },
});
function providerFixture() {
  const vars = configuration();
  return { snapshot: async (project, keys) => { assert.ok(!keys.includes('AUTH_GOOGLE_SECRET')); return vars[project]; },
    list: async () => ['AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET'].map((key) => ({ key, id: key, type: 'sensitive', target: ['production'] })),
    previousDeployment: async (project) => `https://old-${project}.vercel.app`,
    replace: async () => assert.fail('plan attempted environment write') };
}
const ready = { complete: true, ready: true, googleIdentityCount: 0, legacyGoogleLinkRequired: true, retainedRows: { users: 1 } };

test('plan defaults read-only and requires an immutable revision and private admin input', () => {
  assert.equal(validateReleaseInput(env), 'plan');
  assert.throws(() => validateReleaseInput({ ...env, RELEASE_REVISION: 'main' }), /immutable/);
  assert.throws(() => validateReleaseInput({ ...env, RELEASE_MODE: 'deploy' }), /confirmation/);
  assert.throws(() => validateReleaseInput({ ...env, BOOTSTRAP_ADMIN_EMAIL: '' }), /admin_email/);
  assert.throws(() => validateReleaseInput({ ...env, ADMIN_IMPORT_POLICY: 'compatible-history' }), /account_only/);
});

test('plan only reads provider and calls bootstrap in read-only mode, keeping private values out of evidence', async () => {
  const modes = [];
  const result = await runProductionAdminRelease(env, { provider: providerFixture(), bootstrap: async (input) => {
    modes.push(input.BOOTSTRAP_MODE);
    assert.equal(input.ADMIN_IMPORT_POLICY, 'account-only');
    assert.equal(input.SOURCE_DATABASE_URL.includes('private_password'), true);
    return ready;
  } });
  assert.equal(result.complete, true);
  assert.deepEqual(modes, ['plan']);
  assert.equal(result.bootstrap.legacyGoogleLinkRequired, true);
  for (const privateValue of ['private_password', 'private_user', env.BOOTSTRAP_ADMIN_EMAIL, env.VERCEL_TOKEN, service, auth, 'oauth-private-value']) {
    assert.equal(JSON.stringify(result).includes(privateValue), false);
  }
});

test('plan exposes factual missing privilege while making no writes', async () => {
  const result = await runProductionAdminRelease(env, { provider: providerFixture(), bootstrap: async () => ({ ...ready, ready: false, createDatabasePrivilege: false, reason: 'create_database_privilege_missing' }) });
  assert.equal(result.complete, false);
  assert.equal(result.bootstrap.reason, 'create_database_privilege_missing');
});

test('critical service secrets must be strong, identical and distinct from auth', async () => {
  const provider = providerFixture();
  const vars = configuration(); vars.web.SERVICE_SECRET.value = 'weak';
  provider.snapshot = async (project) => vars[project];
  const result = await inspectConfiguration(env, provider);
  assert.equal(result.ready, false);
  assert.equal(result.checks.serviceSecretMatches, false);
  assert.equal(result.checks.serviceSecretStrong, false);
});

test('only documented Neon pooler hostnames derive a direct URL, preserving credentials and database', () => {
  const pooled = 'postgresql://user:password@ep-fixture-pooler.eu-west-1.aws.neon.tech/legacy?sslmode=require&channel_binding=require';
  const direct = directSourceUrl(pooled);
  assert.equal(direct.sourceDirectDerived, true);
  const parsed = new URL(direct.value);
  assert.equal(parsed.hostname, 'ep-fixture.eu-west-1.aws.neon.tech');
  assert.equal(parsed.pathname, '/legacy'); assert.equal(parsed.username, 'user'); assert.equal(parsed.password, 'password');
  assert.equal(parsed.searchParams.get('sslmode'), 'verify-full');
  assert.throws(() => directSourceUrl(pooled.replace('aws.neon.tech', 'aws.neon.tech.evil.test')), /unrecognized/);
  assert.throws(() => directSourceUrl(pooled.replace('ep-fixture', 'other')), /unrecognized/);
});

test('provider resolves the unique production ID and never requests all decrypted environment values', async () => {
  const calls = [];
  const provider = new VercelProduction(env, async (url, options) => {
    calls.push({ url: String(url), method: options.method });
    return { ok: true, status: 200, json: async () => String(url).includes('/v10/') ? { envs: [{ key: 'DATABASE_URL', id: 'id-private', target: ['production'] }] } : { decrypted: true, value: source } };
  });
  const result = await provider.snapshot('api', ['DATABASE_URL']);
  assert.equal(result.DATABASE_URL.value, source);
  assert.match(calls[0].url, /decrypt=false/);
  assert.match(calls[1].url, /env\/id-private/);
  assert.ok(calls.every((call) => call.method === 'GET'));
});

test('ambiguous production values fail closed before decrypting one', async () => {
  const provider = new VercelProduction(env);
  await assert.rejects(provider.variable('api', [1, 2].map((id) => ({ key: 'DATABASE_URL', id: String(id), target: ['production'] })), 'DATABASE_URL'), /ambiguous/);
});

test('plain variables accept metadata strings without requesting decryption', async () => {
  const provider = new VercelProduction(env);
  provider.request = async () => assert.fail('plain metadata should require no decryption request');
  const original = { id: 'plain-id', key: 'FRONTEND_URL', type: 'plain', target: ['production'], value: 'https://frontend.example.test' };
  assert.deepEqual(await provider.variable('api', [original], 'FRONTEND_URL'), original);
});

test('plain variables accept a per-ID string with decrypted false when metadata omits the value', async () => {
  const provider = new VercelProduction(env);
  provider.request = async () => ({ decrypted: false, value: 'https://frontend.example.test' });
  const original = { id: 'plain-id', key: 'FRONTEND_URL', type: 'plain', target: ['production'] };
  assert.equal((await provider.variable('api', [original], 'FRONTEND_URL')).value, 'https://frontend.example.test');
});

test('encrypted values require explicit decryption and write-only values never become readable metadata', async () => {
  const provider = new VercelProduction(env);
  provider.request = async () => ({ decrypted: false, value: 'not-decrypted-ciphertext' });
  const encrypted = { id: 'encrypted-id', key: 'SERVICE_SECRET', type: 'encrypted', target: ['production'], value: 'ciphertext' };
  await assert.rejects(provider.variable('api', [encrypted], 'SERVICE_SECRET'), /unreadable_service_secret/);
  provider.request = async () => assert.fail('write-only variables must not be requested');
  for (const type of ['sensitive', 'secret']) {
    await assert.rejects(provider.variable('api', [{ ...encrypted, type }], 'SERVICE_SECRET'), /unreadable_service_secret/);
  }
});

test('shared environment variables split production without altering preview values and compensate in reverse order', async () => {
  const provider = new VercelProduction(env);
  const calls = [];
  provider.request = async (path, method, body) => { calls.push({ path, method, body }); return {}; };
  provider.list = async () => [{ key: 'ADMIN_EMAILS', id: 'new-id', target: ['production'] }];
  const undo = [];
  const old = { id: 'shared-id', value: 'old-private', target: ['production', 'preview'], type: 'encrypted' };
  await provider.replace('api', old, 'ADMIN_EMAILS', 'new-private', undo);
  assert.deepEqual(calls[0].body, { target: ['preview'] });
  assert.deepEqual(calls[1].body.target, ['production']);
  for (const action of undo.reverse()) await action();
  assert.equal(calls[2].method, 'DELETE');
  assert.deepEqual(calls[3].body, { value: old.value, target: old.target, type: old.type });
  await assert.rejects(provider.replace('api', null, 'AUTH_SECRET', 'rotate-forbidden', []), /allowlisted/);
});

test('deployment requires the latest exact-SHA CI and rejects PR-only or failed runs', async () => {
  const input = { ...env, GITHUB_TOKEN: 'gh-private', GITHUB_REPOSITORY: 'owner/project' };
  const query = (runs) => async () => ({ ok: true, json: async () => ({ workflow_runs: runs }) });
  const success = { id: 10, head_sha: revision, event: 'workflow_dispatch', status: 'completed', conclusion: 'success' };
  assert.equal((await requireSuccessfulCi(input, query([success]))).runId, 10);
  await assert.rejects(requireSuccessfulCi(input, query([{ ...success, event: 'pull_request' }])), /exact_revision/);
  await assert.rejects(requireSuccessfulCi(input, query([success, { ...success, id: 11, conclusion: 'failure' }])), /exact_revision/);
  await assert.rejects(requireSuccessfulCi(input, query([{ ...success, head_sha: 'b'.repeat(40) }])), /exact_revision/);
});

test('failed staged deployment restores values without promotion and retains the newly created database', async () => {
  const provider = providerFixture(); const calls = []; let undone = 0;
  provider.replace = async (project, _original, key, value, undo) => {
    calls.push(key); undo.push(async () => { undone += 1; });
    if (key === 'BOOTSTRAP_ADMIN_USER_ID') { assert.equal(project, 'api'); assert.equal(value, privateAdminId); }
  };
  const result = await deployClosedProduction(env, { ...configuration(), source }, provider, {
    bootstrap: async (input) => { assert.equal(input.ADMIN_IMPORT_POLICY, 'account-only'); return { ...ready, targetCreated: true, adminCopyVerified: true }; },
    selectedAdminId: async () => privateAdminId,
    command: (_command, args) => { if (args.includes('build')) { assert.ok(calls.includes('BOOTSTRAP_ADMIN_USER_ID')); throw new Error('secret payload must not escape'); } return ''; },
    health: async () => assert.fail('health before deployment'), cleanup: async () => {},
  });
  assert.equal(result.complete, false); assert.equal(result.rollbackComplete, true);
  assert.equal(result.newDatabaseRetained, true); assert.equal(undone, calls.length);
  assert.ok(calls.includes('BOOTSTRAP_ADMIN_USER_ID'));
  assert.equal(JSON.stringify(result).includes('secret payload'), false);
  assert.equal(JSON.stringify(result).includes(privateAdminId), false);
});

test('promotion failure rolls back both projects and reports incomplete compensation', async () => {
  const provider = providerFixture(); const promotions = [];
  provider.replace = async (_project, _original, _key, _value, undo) => { undo.push(async () => {}); };
  let deployCount = 0;
  const result = await deployClosedProduction(env, { ...configuration(), source }, provider, {
    bootstrap: async () => ({ ...ready, targetCreated: true, adminCopyVerified: true }), selectedAdminId: async () => privateAdminId,
    cleanup: async () => {}, health: async () => {}, denied: async () => {},
    command: (_command, args) => {
      if (args.includes('deploy')) return `https://new-${deployCount++}.vercel.app\n`;
      if (args.includes('promote')) {
        promotions.push(args[args.indexOf('promote') + 1]);
        if (promotions.length === 1 || args.includes('https://old-api.vercel.app')) throw new Error('private failure');
      }
      return '';
    },
  });
  assert.deepEqual(promotions, ['https://new-0.vercel.app', 'https://old-web.vercel.app', 'https://old-api.vercel.app']);
  assert.equal(result.reason, 'release_failed_manual_rollback_required');
});

test('a copied admin UUID mismatch prevents every provider mutation and build', async () => {
  const provider = providerFixture(); let reads = 0;
  const result = await deployClosedProduction(env, { ...configuration(), source }, provider, {
    bootstrap: async () => ({ ...ready, targetCreated: true, adminCopyVerified: true }),
    selectedAdminId: async () => reads++ === 0 ? privateAdminId : 'b7d2bc72-c313-4abc-835c-161498a2c0b1',
    command: () => assert.fail('mismatched admin must not build'), cleanup: async () => {},
  });
  assert.equal(result.complete, false); assert.equal(result.rollbackComplete, true);
  assert.equal(result.newDatabaseRetained, true); assert.equal(JSON.stringify(result).includes(privateAdminId), false);
});

test('protected API must deny an unauthenticated request even when health is green', async () => {
  const fetcher = (status) => async (_url, request) => {
    assert.equal(request.headers['x-internal-secret'], undefined);
    assert.equal(request.headers['x-user-id'], undefined);
    return { status, headers: new Headers({ 'content-type': 'application/json' }) };
  };
  await assert.rejects(checkUnauthenticatedApiDenied('https://api.example.test', { fetcher: fetcher(200) }), /not_denied/);
  assert.deepEqual(await checkUnauthenticatedApiDenied('https://api.example.test', { fetcher: fetcher(401) }), { unauthenticatedProtectedApiStatus: 401 });
});

test('workflow preserves encrypted backup before release under the shared production lock', async () => {
  const workflow = await readFile(new URL('../.github/workflows/production-admin-release.yml', import.meta.url), 'utf8');
  assert.match(workflow, /default: plan/);
  assert.match(workflow, /group: production-database-release/);
  assert.match(workflow, /actions: read/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /ADMIN_IMPORT_POLICY: account-only/);
  assert.ok(workflow.indexOf('Preserve encrypted source backup') < workflow.indexOf('RELEASE_PHASE: release'));
  assert.equal(workflow.includes('GITHUB_ENV'), false);
  assert.equal(workflow.includes('RESTORE_APPLY_CANDIDATE_MIGRATIONS: 1'), false);
});
