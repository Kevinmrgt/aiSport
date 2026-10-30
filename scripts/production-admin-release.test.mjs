import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { VercelProduction, validateReleaseInput, directSourceUrl, inspectConfiguration, runProductionAdminRelease, requireSuccessfulCi, deployClosedProduction, checkUnauthenticatedApiDenied, privateCommand, safeReleaseFailure, verifyReleaseConfiguration, checkReleaseHealth, inspectDeploymentDatabase } from './production-admin-release.mjs';

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
  assert.throws(() => validateReleaseInput({ ...env, BOOTSTRAP_REUSE_EXISTING: 'true' }), /reuse_confirmation/);
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

test('opted-in existing target plans require read-only verification and never claim creation', async () => {
  const input = { ...env, BOOTSTRAP_REUSE_EXISTING: 'verified-admin-copy' };
  const reusable = { ...ready, targetExists: true, targetReused: true, existingTargetVerified: true, targetCreated: false };
  const result = await runProductionAdminRelease(input, { provider: providerFixture(), bootstrap: async (configuration) => {
    assert.equal(configuration.BOOTSTRAP_REUSE_EXISTING, 'verified-admin-copy'); return reusable;
  } });
  assert.equal(result.complete, true); assert.equal(result.reuseExistingRequested, true);
  assert.equal(result.bootstrap.targetCreated, false); assert.equal(result.bootstrap.existingTargetVerified, true);
  for (const override of [{ existingTargetVerified: false }, { targetCreated: true }]) {
    const blocked = await runProductionAdminRelease(input, { provider: providerFixture(), bootstrap: async () => ({ ...reusable, ...override }) });
    assert.equal(blocked.complete, false); assert.equal(blocked.reason, 'existing_target_reuse_not_verified');
  }
  const notOptedIn = await runProductionAdminRelease(env, { provider: providerFixture(), bootstrap: async () => reusable });
  assert.equal(notOptedIn.complete, false);
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
  provider.request = async (path, method, body) => {
    calls.push({ path, method, body });
    return method === 'POST' ? { created: { id: 'new-id', key: body.key, target: ['production'] }, failed: [] } : {};
  };
  provider.list = async () => [{ key: 'ADMIN_EMAILS', id: 'new-id', target: ['production'] }];
  const undo = [];
  const old = { id: 'shared-id', value: 'old-private', target: ['production', 'preview'], type: 'encrypted' };
  await provider.replace('api', old, 'ADMIN_EMAILS', 'new-private', undo);
  assert.deepEqual(calls[0].body, { target: ['preview'] });
  assert.equal(calls[0].path, '/v9/projects/api/env/shared-id');
  assert.deepEqual(calls[1].body.target, ['production']);
  assert.equal(calls[1].path, '/v10/projects/api/env');
  for (const action of undo.reverse()) await action();
  assert.equal(calls[2].method, 'DELETE');
  assert.equal(calls[2].path, '/v9/projects/api/env/new-id');
  assert.equal(calls[3].path, '/v9/projects/api/env/shared-id');
  assert.deepEqual(calls[3].body, { value: old.value, target: old.target, type: old.type });
  await assert.rejects(provider.replace('api', null, 'AUTH_SECRET', 'rotate-forbidden', []), /allowlisted/);
});

test('a Vercel HTTP 200 containing failed environment creations cannot qualify a write', async () => {
  const provider = new VercelProduction(env);
  provider.request = async () => ({ created: {}, failed: [{ error: { message: 'private provider detail', value: 'private-value' } }] });
  const undo = [];
  await assert.rejects(provider.replace('api', null, 'PRODUCTION_ACCESS_MODE', 'admin-only', undo), (error) => {
    assert.equal(error.message, 'vercel_environment_create_failed');
    assert.equal(JSON.stringify(error).includes('private'), false);
    return true;
  });
  assert.equal(undo.length, 1);
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
    command: (command, args, input, timeout, options) => {
      if (args.includes('build')) {
        assert.ok(calls.includes('BOOTSTRAP_ADMIN_USER_ID'));
        return privateCommand(command, args, input, timeout, { ...options, spawn: () => ({ status: 1, stdout: 'private stdout', stderr: 'secret payload must not escape' }) });
      }
      return '';
    },
    health: async () => assert.fail('health before deployment'), cleanup: async () => {}, verifyConfiguration: async () => {},
  });
  assert.equal(result.complete, false); assert.equal(result.rollbackComplete, true);
  assert.equal(result.newDatabaseRetained, true); assert.equal(undone, calls.length);
  assert.ok(calls.includes('BOOTSTRAP_ADMIN_USER_ID'));
  assert.equal(JSON.stringify(result).includes('secret payload'), false);
  assert.equal(JSON.stringify(result).includes(privateAdminId), false);
  assert.deepEqual(result.failure.command, { stage: 'api_build', tool: 'vercel_cli', exitCode: 1, category: 'nonzero_exit' });
});

test('private command diagnostics disclose only allowlisted stage, tool, numeric exit and static category', () => {
  for (const [code, category] of [['ETIMEDOUT', 'timeout'], ['ENOENT', 'tool_missing'], ['__proto__', 'nonzero_exit']]) {
    assert.throws(() => privateCommand('npx', ['private-arg'], { PRIVATE_VALUE: 'private-env' }, 10, {
      stage: 'api_build', spawn: () => ({ status: null, error: { code, message: 'private-error' }, stdout: 'private-stdout', stderr: 'private-stderr' }),
    }), (error) => {
      assert.equal(error.message, 'private_command_failed');
      assert.deepEqual(error.diagnostics, { stage: 'api_build', tool: 'vercel_cli', exitCode: null, category });
      assert.equal(JSON.stringify(error).includes('private-'), false);
      return true;
    });
  }
  assert.throws(() => privateCommand('unknown-private-path', ['private-arg'], {}, 10, {
    stage: 'private-untrusted-stage', spawn: () => ({ status: 2 }),
  }), (error) => { assert.equal(error.diagnostics.stage, 'private_command'); assert.equal(error.diagnostics.tool, 'other'); return true; });
});

test('promotion failure rolls back both projects and reports incomplete compensation', async () => {
  const provider = providerFixture(); const promotions = [];
  provider.replace = async (_project, _original, _key, _value, undo) => { undo.push(async () => {}); };
  let deployCount = 0;
  const result = await deployClosedProduction(env, { ...configuration(), source }, provider, {
    bootstrap: async () => ({ ...ready, targetCreated: true, adminCopyVerified: true }), selectedAdminId: async () => privateAdminId,
    cleanup: async () => {}, health: async () => {}, denied: async () => {}, verifyConfiguration: async () => {},
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

test('an unverified reused apply target blocks provider writes and builds', async () => {
  const result = await deployClosedProduction({ ...env, BOOTSTRAP_REUSE_EXISTING: 'verified-admin-copy' }, { ...configuration(), source }, providerFixture(), {
    bootstrap: async () => ({ ...ready, targetExists: true, targetReused: true, existingTargetVerified: false, targetCreated: false, adminCopyVerified: true }),
    selectedAdminId: async () => assert.fail('unverified reuse must not reach identity lookup'),
    command: () => assert.fail('unverified reuse must not build'), cleanup: async () => {},
  });
  assert.equal(result.complete, false); assert.equal(result.failure.reason, 'existing_target_reuse_not_verified');
  assert.equal(result.newDatabaseRetained, false);
});

test('a strictly verified reused target can deploy without falsely claiming database creation', async () => {
  const provider = providerFixture(); const requested = { ...env, BOOTSTRAP_REUSE_EXISTING: 'verified-admin-copy' };
  provider.replace = async () => {};
  let deployments = 0;
  const result = await deployClosedProduction(requested, { ...configuration(), source }, provider, {
    bootstrap: async (input) => {
      assert.equal(input.BOOTSTRAP_REUSE_EXISTING, 'verified-admin-copy');
      return { ...ready, targetExists: true, targetReused: true, existingTargetVerified: true, targetCreated: false, adminCopyVerified: true };
    },
    selectedAdminId: async () => privateAdminId, cleanup: async () => {}, health: async () => {}, denied: async () => {}, verifyConfiguration: async () => {},
    command: (_command, args) => args.includes('deploy') ? `https://verified-reuse-${deployments++}.vercel.app` : '',
  });
  assert.equal(result.complete, true); assert.equal(result.reuseExistingRequested, true);
  assert.equal(result.bootstrap.targetCreated, false); assert.equal(result.bootstrap.targetReused, true);
  assert.equal(result.bootstrap.existingTargetVerified, true); assert.equal(deployments, 2);
});

test('an environment fetch timeout reports its exact safe stage and category after rollback', async () => {
  const provider = providerFixture(); let rolledBack = false;
  provider.replace = async (_project, _original, _key, _value, undo) => {
    undo.push(async () => { rolledBack = true; });
    throw new DOMException('private-request-url-and-value', 'TimeoutError');
  };
  const result = await deployClosedProduction(env, { ...configuration(), source }, provider, {
    bootstrap: async () => ({ ...ready, targetCreated: true, adminCopyVerified: true }), selectedAdminId: async () => privateAdminId,
    command: () => assert.fail('timeout must prevent build'), cleanup: async () => {},
  });
  assert.equal(rolledBack, true); assert.equal(result.rollbackComplete, true);
  assert.equal(result.failure.failedStage, 'api_env_DATABASE_URL');
  assert.equal(result.failure.errorClass, 'TimeoutError'); assert.equal(result.failure.category, 'timeout');
  assert.equal(JSON.stringify(result).includes('private-request'), false);
});

test('private source and target admin lookup failures retain safe classes and allowlisted bootstrap reasons', async () => {
  class BootstrapError extends Error { constructor(reason) { super('private lookup details'); this.reason = reason; } }
  for (const [failingRead, error, expectedReason] of [
    [0, Object.assign(new Error('private source DSN'), { code: '42501' }), 'private_diagnostics_required'],
    [1, new BootstrapError('admin_identity_lookup_failed'), 'admin_identity_lookup_failed'],
    [1, new BootstrapError('private-unrecognized-reason'), 'private_diagnostics_required'],
  ]) {
    let reads = 0;
    const result = await deployClosedProduction(env, { ...configuration(), source }, providerFixture(), {
      bootstrap: async () => ({ ...ready, targetCreated: true, adminCopyVerified: true }),
      selectedAdminId: async () => { if (reads++ === failingRead) throw error; return privateAdminId; },
      command: () => assert.fail('lookup failure must prevent build'), cleanup: async () => {},
    });
    assert.equal(result.failure.failedStage, failingRead === 0 ? 'admin_lookup_source' : 'admin_lookup_target');
    assert.equal(result.failure.reason, expectedReason);
    if (failingRead === 0) { assert.equal(result.failure.pgCode, '42501'); assert.equal(result.failure.category, 'postgresql'); }
    assert.equal(JSON.stringify(result).includes('private source'), false);
    assert.equal(JSON.stringify(result).includes('private lookup'), false);
    assert.equal(JSON.stringify(result).includes('private-unrecognized'), false);
  }
});

test('diagnostics reject untrusted stage, class, code and message text', () => {
  const result = safeReleaseFailure({ name: 'private-class', code: 'private-code', message: 'private-message', stack: 'private-stack', cause: { code: 'private-cause' } }, 'private-stage');
  assert.equal(result.failedStage, 'unknown_stage'); assert.equal(result.errorClass, 'UnknownError');
  assert.equal(JSON.stringify(result).includes('private-'), false);
});

test('release environment readback requires exact database, access mode and admin UUID before any build', async () => {
  const expected = { DATABASE_URL: 'private-new-database-url', PRODUCTION_ACCESS_MODE: 'admin-only', BOOTSTRAP_ADMIN_USER_ID: privateAdminId };
  const snapshot = { snapshot: async (_project, keys) => { assert.deepEqual(keys, Object.keys(expected)); return Object.fromEntries(keys.map((key) => [key, { value: expected[key] }])); } };
  assert.deepEqual(await verifyReleaseConfiguration('api', expected, snapshot), { matched: true, keysVerified: 3 });
  for (const key of Object.keys(expected)) {
    await assert.rejects(verifyReleaseConfiguration('api', expected, { snapshot: async () => Object.fromEntries(Object.entries(expected).map(([name, value]) => [name, { value: name === key ? 'private-stale-value' : value }])) }), /release_environment_readback_mismatch/);
  }
  const provider = providerFixture(); provider.replace = async () => {};
  const result = await deployClosedProduction(env, { ...configuration(), source }, provider, {
    bootstrap: async () => ({ ...ready, targetCreated: true, adminCopyVerified: true }), selectedAdminId: async () => privateAdminId,
    command: () => assert.fail('a stale readback must prevent pull/build/deploy'), cleanup: async () => {},
  });
  assert.equal(result.complete, false); assert.equal(result.failure.failedStage, 'api_env_readback');
  assert.equal(result.failure.reason, 'release_environment_readback_mismatch');
  assert.equal(JSON.stringify(result).includes(privateAdminId), false);
});

test('staged schema failure retains only validated deployment URLs and safe health facts without promoting', async () => {
  const provider = providerFixture(); provider.replace = async () => {};
  const fetcher = async () => new Response(JSON.stringify({ status: 'not_ready', service: 'alcide-api', revision,
    checks: { database: 'ok', schema: 'missing', aiConfiguration: 'ok', privateExtra: 'private-readiness-detail' },
    privateExtra: 'private-payload', timestamp: new Date().toISOString() }), { status: 503, headers: { 'content-type': 'application/json' } });
  const result = await deployClosedProduction(env, { ...configuration(), source }, provider, {
    bootstrap: async () => ({ ...ready, targetCreated: true, adminCopyVerified: true }), selectedAdminId: async () => privateAdminId,
    verifyConfiguration: async () => {}, cleanup: async () => {},
    health: (url, expected) => checkReleaseHealth(url, expected, { fetcher }),
    command: (_command, args) => { assert.equal(args.includes('promote'), false); return args.includes('deploy') ? 'https://safe-candidate.vercel.app' : ''; },
  });
  assert.equal(result.complete, false); assert.equal(result.failure.failedStage, 'api_health');
  assert.equal(result.failure.reason, 'health_schema_missing'); assert.equal(result.failure.httpStatus, 503);
  assert.deepEqual(result.failure.healthChecks, { database: 'ok', schema: 'missing', aiConfiguration: 'ok' });
  assert.deepEqual(result.stagedDeploymentUrls, ['https://safe-candidate.vercel.app']);
  assert.equal(JSON.stringify(result).includes('private-payload'), false); assert.equal(JSON.stringify(result).includes('private-readiness'), false);
});

test('health diagnostics whitelist fixed messages and statuses while rejecting arbitrary provider text', () => {
  for (const [message, reason] of [['Health HTTP 401', 'health_http_error'], ['Health response is not JSON', 'health_response_not_json'],
    ['Served revision differs from candidate', 'health_revision_mismatch'], ['Stale or invalid health timestamp', 'health_timestamp_invalid']]) {
    const result = safeReleaseFailure(new Error(message), 'api_health'); assert.equal(result.reason, reason);
    if (message === 'Health HTTP 401') assert.equal(result.httpStatus, 401);
  }
  assert.equal(safeReleaseFailure(new Error('Health HTTP 401 private-url'), 'api_health').reason, 'private_diagnostics_required');
});

test('a health redirect never transfers an existing automation header to a different host', async () => {
  let calls = 0;
  await assert.rejects(checkReleaseHealth('https://safe-candidate.vercel.app/health/ready', { service: 'alcide-api', status: 'ready', revision }, {
    bypassSecret: 'private-existing-header', fetcher: async (_url, request) => {
      calls += 1; assert.equal(request.headers['x-vercel-protection-bypass'], 'private-existing-header');
      return new Response(null, { status: 302, headers: { location: 'https://other-candidate.vercel.app/health/ready' } });
    },
  }), /health_cross_origin_redirect_refused/);
  assert.equal(calls, 1);
});

test('the immutable deployment diagnostic reads its resolved env privately and distinguishes an old database', async () => {
  const calls = [];
  const input = { ...env, DIAGNOSTIC_DEPLOYMENT_URL: 'https://candidate-fixture.vercel.app' };
  const provider = {
    snapshot: async () => ({ DATABASE_URL: { value: source } }),
    request: async (path) => {
      calls.push(path);
      return path.startsWith('/v13/') ? { id: 'dpl_fixture', projectId: 'api', url: 'candidate-fixture.vercel.app' } :
        { env: { DATABASE_URL: source, APP_REVISION: revision, PRODUCTION_ACCESS_MODE: 'admin-only', PRIVATE_KEY: 'never-persist-this-value' }, buildEnv: {} };
    },
  };
  const report = await inspectDeploymentDatabase(input, { provider, databaseInspector: async (value) => {
    assert.equal(new URL(value).pathname, '/legacy');
    return { databaseNameMatchesEnvironment: true, migrationTablePresent: true, migrationCount: 12, latestMigrationTimestamp: 1793284984709, privateExtra: 'never-persist-this-value' };
  } });
  assert.equal(report.complete, true); assert.equal(report.readOnly, true);
  assert.equal(report.runtimeDatabaseNameMatchesTarget, false); assert.equal(report.runtimeDatabaseNameMatchesCurrentProject, true);
  assert.equal(report.runtimeConnectionMatchesTarget, false); assert.equal(report.sql.migrationCount, 12);
  assert.equal(report.runtimeRevisionMatchesExpected, true); assert.equal(report.functionEnvironmentOverridesInspected, false);
  assert.deepEqual(calls, ['/v13/deployments/candidate-fixture.vercel.app', '/v3/env/pull/dpl_fixture']);
  for (const value of ['never-persist-this-value', 'private_user', 'private_password', '/legacy']) assert.equal(JSON.stringify(report).includes(value), false);
});

test('deployment diagnostics fail closed for foreign projects and omit every encrypted provider error detail', async () => {
  const input = { ...env, DIAGNOSTIC_DEPLOYMENT_URL: 'https://candidate-fixture.vercel.app' };
  const report = await inspectDeploymentDatabase(input, { provider: {
    request: async () => ({ id: 'dpl_fixture', projectId: 'foreign', url: 'candidate-fixture.vercel.app' }),
    snapshot: async () => assert.fail('a foreign deployment must not resolve secrets'),
  }, databaseInspector: async () => assert.fail('a foreign deployment must not connect') });
  assert.equal(report.complete, false); assert.equal(report.reason, 'diagnostic_deployment_project_mismatch');
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
  assert.match(workflow, /reuse_existing:\s*\n\s*description:[^\n]*\n\s*type: boolean\s*\n\s*default: false/);
  assert.match(workflow, /BOOTSTRAP_REUSE_EXISTING: \$\{\{ inputs.reuse_existing && 'verified-admin-copy' \|\| '' \}\}/);
  assert.ok(workflow.indexOf('Preserve encrypted source backup') < workflow.indexOf('RELEASE_PHASE: release'));
  assert.equal(workflow.includes('GITHUB_ENV'), false);
  assert.equal(workflow.includes('RESTORE_APPLY_CANDIDATE_MIGRATIONS: 1'), false);
});
