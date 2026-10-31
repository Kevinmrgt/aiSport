import assert from 'node:assert/strict';
import test from 'node:test';
import { access, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { VercelProduction, validateReleaseInput, validateLegalPublisherInput, directSourceUrl, inspectConfiguration, runProductionAdminRelease, requireSuccessfulCi, deployClosedProduction, checkUnauthenticatedApiDenied, privateCommand, safeReleaseFailure, verifyReleaseConfiguration, checkReleaseHealth, inspectDeploymentDatabase, safeVercelValidation, cleanupVercelCheckout, inspectVercelBuildArtifacts, bindVercelFunctionEnvironment, checkWebOAuthConfiguration, verifyLiveAdminProduction, rehearse, verifyPreparedBackup, validateAdditiveMigrationSql, readAdditiveUpdatePlan, applyAdditiveLiveUpdate, checkAliasConvergence, verifyRestoredConfiguration } from './production-admin-release.mjs';
import { readCandidateLineage } from './db-migration-lineage.mjs';
import { fileHash, migrationFingerprint } from './db-operations.mjs';
import { createHash } from 'node:crypto';
import { pinnedPilotMigration, validatePinnedPilotMigration, verifyClosedPilotState } from './production-admin-release.mjs';

const revision = 'a'.repeat(40);
const oldRevision = 'b'.repeat(40);
const previousReference = (project) => ({ component: project, alias: project === 'api' ? 'ai-sport-api.vercel.app' : 'www.alcideai.fr',
  url: `https://old-${project}.vercel.app`, revision: oldRevision, servedRevisionVerified: true });
const privateAdminId = 'd72a58b7-6d4f-4187-90f7-9c763cfe2975';
const mockFunctionBinder = async () => ({ complete: true, nodeBoundCount: 1, readbackVerified: true });
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
  return { snapshot: async (project, keys) => {
    assert.ok(!keys.includes('AUTH_GOOGLE_SECRET'));
    if (project === 'web') { assert.ok(keys.includes('AUTH_URL')); assert.ok(keys.includes('NEXTAUTH_URL')); }
    return vars[project];
  },
    list: async () => ['AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET'].map((key) => ({ key, id: key, type: 'sensitive', target: ['production'] })),
    temporaryAutomationBypass: async (_project, undo) => {
      const revoke = async () => {}; undo.push(revoke); return { secret: 'private-fixture-bypass', revoke };
    },
    previousDeployment: async (project) => previousReference(project), verifyAliasDeployment: async () => ({ assignmentVerified: true }),
    replace: async () => assert.fail('plan attempted environment write') };
}
const ready = { complete: true, ready: true, googleIdentityCount: 0, legacyGoogleLinkRequired: true, retainedRows: { users: 1 } };

// Entirely fictional public-notice fixtures. Never use a real publisher here.
const publisherFixture = () => ({ LEGAL_OPERATOR_NAME: 'Fixture Publisher EI', LEGAL_CONTACT_EMAIL: 'public@example.test',
  LEGAL_HOSTING_NAME: 'Fixture Web Host', LEGAL_HOSTING_CONTACT: '10 Fixture Avenue, Example City',
  LEGAL_OPERATOR_ADDRESS: '20 Fixture Road, Example City', LEGAL_CONTACT_PHONE: '+33 1 00 00 00 00',
  LEGAL_OPERATOR_REGISTRATION: 'Fixture register 000000000', LEGAL_PUBLICATION_DIRECTOR: 'Fixture Director',
  LEGAL_DATA_HOSTING_NAME: 'Fixture Data Host', LEGAL_DATA_HOSTING_CONTACT: '30 Fixture Lane, Example City' });
const publisherInput = (values = publisherFixture()) => ({ ...env, RELEASE_MODE: 'update', PUBLISHER_CONFIRM: 'publish-provided-required-notices', LEGAL_PUBLISHER_JSON: JSON.stringify(values) });

test('legal notices need the exact explicit deploy/update opt-in and ignore an unused secret', () => {
  for (const mode of ['plan', 'rehearse', 'deploy', 'update']) {
    assert.deepEqual(validateLegalPublisherInput({ ...env, RELEASE_MODE: mode, LEGAL_PUBLISHER_JSON: 'unused invalid JSON' }), {});
  }
  for (const mode of ['deploy', 'update']) assert.deepEqual(validateLegalPublisherInput({ ...publisherInput(), RELEASE_MODE: mode }), publisherFixture());
  for (const change of [{ RELEASE_MODE: 'plan' }, { RELEASE_MODE: 'rehearse' }, { PUBLISHER_CONFIRM: 'yes' }, { PUBLISHER_CONFIRM: ' publish-provided-required-notices' }]) {
    assert.throws(() => validateLegalPublisherInput({ ...publisherInput(), ...change }), /explicit_legal_publisher_confirmation_required/);
  }
});

test('legal payload rejects arbitrary keys, secrets, executable content and invalid or unbounded data without echoing it', async () => {
  const invalid = [null, [], 'private-marker', {}, { ...publisherFixture(), NEXT_PUBLIC_SERVICE_SECRET: 'private-marker' },
    { ...publisherFixture(), LEGAL_CONTACT_EMAIL: 'private-marker' }, { ...publisherFixture(), LEGAL_CONTACT_PHONE: 'private-marker' },
    ...['javascript:private-marker', 'data:private-marker', '<script>private-marker</script>', 'private-marker\nsecond line', 'postgresql://private-marker', 'sk_live_private-marker', 'x'.repeat(1025), 123, ''].map((value) => ({ ...publisherFixture(), LEGAL_OPERATOR_ADDRESS: value })),
    Object.fromEntries(Object.entries(publisherFixture()).filter(([key]) => key !== 'LEGAL_DATA_HOSTING_CONTACT'))];
  for (const values of invalid) {
    let caught;
    try { validateLegalPublisherInput(publisherInput(values)); } catch (error) { caught = error; }
    assert.ok(caught);
    assert.equal(JSON.stringify(safeReleaseFailure(caught, 'input_validation')).includes('private-marker'), false);
  }
  for (const raw of ['{private-marker', 'x'.repeat(16_385), '{"__proto__":"private-marker"}']) {
    const result = await runProductionAdminRelease({ ...publisherInput(), LEGAL_PUBLISHER_JSON: raw,
      UPDATE_CONFIRM: 'preserve-live-admin-production', BACKUP_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64') }, { fetcher: async () => assert.fail('invalid payload reached CI/provider') });
    assert.equal(result.complete, false); assert.equal(result.failure.failedStage, 'input_validation'); assert.equal(JSON.stringify(result).includes('private-marker'), false);
  }
});

test('legal snapshot is restricted to provided Web keys; omitted VAT and ordinary releases preserve existing settings', async () => {
  for (const confirmed of [false, true]) {
    const input = confirmed ? { ...publisherInput(), RELEASE_MODE: 'deploy' } : { ...env, LEGAL_PUBLISHER_JSON: 'ignored invalid secret' };
    const provider = providerFixture(); const snapshots = [];
    const originalSnapshot = provider.snapshot;
    provider.snapshot = async (project, keys) => { snapshots.push([project, keys]); return originalSnapshot(project, keys); };
    const result = await inspectConfiguration(input, provider);
    assert.deepEqual(result.publisherValues, confirmed ? publisherFixture() : {});
    for (const [project, keys] of snapshots) {
      assert.deepEqual(keys.filter((key) => key.startsWith('LEGAL_')).sort(), confirmed && project === 'web' ? Object.keys(publisherFixture()).sort() : []);
      assert.equal(keys.includes('LEGAL_VAT_NUMBER'), false);
    }
  }
});

test('legal writes enforce Web scope and restore original absence, value, type and shared targets', async () => {
  for (const original of [null, { id: 'existing', key: 'LEGAL_OPERATOR_ADDRESS', value: 'Prior fixture address', type: 'plain', target: ['production'] },
    { id: 'existing', key: 'LEGAL_OPERATOR_ADDRESS', value: 'Prior fixture address', type: 'encrypted', target: ['production', 'preview', 'development'] }]) {
    const state = original ? [structuredClone(original)] : [];
    const provider = new VercelProduction(env); let mutations = 0;
    provider.list = async () => state;
    provider.snapshot = async (_project, keys) => Object.fromEntries(keys.map((key) => [key, state.find((item) => item.key === key && item.target.includes('production')) ?? null]));
    provider.request = async (path, method, body) => {
      mutations += 1;
      if (method === 'PATCH') { Object.assign(state.find((item) => path.endsWith(`/${item.id}`)), body); return {}; }
      if (method === 'DELETE') { state.splice(state.findIndex((item) => path.endsWith(`/${item.id}`)), 1); return {}; }
      assert.equal(method, 'POST'); const item = { ...body, id: 'created' }; state.push(item); return { created: [item] };
    };
    await assert.rejects(provider.replace('api', original, 'LEGAL_OPERATOR_ADDRESS', 'New fixture address', []), /legal_publisher_web_project_required/);
    assert.equal(mutations, 0);
    const undo = []; await provider.replace('web', original, 'LEGAL_OPERATOR_ADDRESS', 'New fixture address', undo);
    assert.equal(state.find((item) => item.target.includes('production')).value, 'New fixture address');
    if (original?.target.length > 1) assert.deepEqual(state.find((item) => item.id === 'existing').target, ['preview', 'development']);
    for (const compensate of undo.reverse()) await compensate();
    assert.equal((await verifyRestoredConfiguration('web', { LEGAL_OPERATOR_ADDRESS: original }, ['LEGAL_OPERATOR_ADDRESS'], provider)).complete, true);
    assert.deepEqual(state, original ? [original] : []);
  }
});

test('publisher notices are Web-only through build/runtime, redact proofs, and compensate a failed staged Web', async () => {
  for (const scenario of ['success', 'health_failure', 'empty_runtime', 'stale_build']) {
    const failWeb = scenario !== 'success';
    const input = publisherInput(); const values = publisherFixture(); const original = configuration();
    for (const key of Object.keys(values)) original.web[key] = null;
    original.web.LEGAL_OPERATOR_ADDRESS = { value: 'Prior fixture address', type: 'plain', target: ['production', 'preview'] };
    original.web.LEGAL_VAT_NUMBER = { value: 'Preserved fixture VAT', type: 'encrypted', target: ['production'] };
    const current = structuredClone(original); const writes = []; const commands = []; const bindings = [];
    const provider = providerFixture();
    provider.snapshot = async (project, keys) => Object.fromEntries(keys.map((key) => [key, current[project][key] ?? null]));
    provider.replace = async (project, captured, key, value, undo) => {
      if (key.startsWith('LEGAL_')) { assert.equal(project, 'web'); assert.deepEqual(captured, original.web[key]); }
      writes.push([project, key]); const prior = structuredClone(current[project][key]);
      undo.push(async () => { if (prior === undefined) delete current[project][key]; else current[project][key] = prior; });
      current[project][key] = { value, target: ['production'], type: prior?.type ?? 'encrypted' };
    };
    const result = await deployClosedProduction(input, { ...original, source }, provider, {
      liveVerifier: async () => ({ adminId: privateAdminId, evidence: { complete: true, existingLiveTargetVerified: true, pendingMigrations: 0 } }),
      cleanup: async () => {}, denied: async () => {}, oauthConfiguration: async () => ({ canonicalCallbackVerified: true }),
      health: async (url) => { if (scenario === 'health_failure' && url === 'https://new-web.vercel.app/api/health') throw new Error('private-marker'); },
      functionEnvironmentBinder: async (_env, { component, expectedValues }) => {
        bindings.push(component);
        assert.deepEqual(Object.keys(expectedValues).filter((key) => key.startsWith('LEGAL_')).sort(), component === 'web' ? Object.keys(values).sort() : []);
        return scenario === 'empty_runtime' && component === 'web' ? { complete: true, readbackVerified: true, nodeBoundCount: 0 } : mockFunctionBinder();
      },
      artifactInspector: async (_env, { component }) => ({ complete: true, onlyOneOutputDirectory: true, environmentOverridesConsistent: true, outputs: [{
        projectIdMatches: true, projectRootDirectoryMatches: true, productionBuildTarget: true, cliVersionMatches: true,
        pulledEnvironmentPresent: true, pulledEnvironmentComparedKeys: component === 'web' ? Object.keys(values) : [],
        pulledEnvironmentMismatchedKeys: scenario === 'stale_build' && component === 'web' ? ['LEGAL_OPERATOR_ADDRESS'] : [],
      }] }),
      command: (_tool, args, child) => {
        commands.push(args); assert.equal(child.LEGAL_PUBLISHER_JSON, undefined);
        assert.deepEqual(Object.keys(child).filter((key) => key.startsWith('LEGAL_')).sort(), child.VERCEL_PROJECT_ID === 'web' ? Object.keys(values).sort() : []);
        for (const value of Object.values(values)) assert.equal(args.includes(value), false);
        if (args.includes('deploy')) return `https://new-${child.VERCEL_PROJECT_ID}.vercel.app`;
        return '';
      },
    });
    assert.deepEqual(bindings, ['api', 'web']);
    assert.equal(result.complete, !failWeb);
    if (scenario === 'empty_runtime') assert.equal(result.failure.reason, 'legal_publisher_runtime_binding_required');
    if (scenario === 'stale_build') assert.equal(result.failure.reason, 'legal_publisher_build_verification_required');
    assert.equal(writes.some(([, key]) => key === 'LEGAL_VAT_NUMBER'), false);
    for (const value of [...Object.values(values), 'private-marker', 'Prior fixture address', 'Preserved fixture VAT']) assert.equal(JSON.stringify(result).includes(value), false);
    if (failWeb) { assert.equal(result.rollbackComplete, true); assert.deepEqual(current, original); assert.equal(commands.some((args) => args.includes('promote')), false); }
    else { assert.equal(result.legalPublisher.applied, true); for (const [key, value] of Object.entries(values)) assert.equal(current.web[key].value, value); }
  }
});

const aliasHealthPayload = (servedRevision, extra = {}) => ({ service: 'alcide-api', status: 'ready', revision: servedRevision,
  timestamp: new Date().toISOString(), checks: { database: 'ok', schema: 'ok', aiConfiguration: 'ok' }, ...extra });

test('rollback reference resolves the real production alias and its served revision, never project.targets.production', async () => {
  const paths = []; let publicCalls = 0;
  const provider = new VercelProduction(env, async (url, options) => {
    if (url.hostname === 'api.vercel.com') {
      paths.push(url.pathname); assert.equal(url.searchParams.get('teamId'), env.VERCEL_ORG_ID);
      assert.equal(options.headers.Authorization, `Bearer ${env.VERCEL_TOKEN}`);
      const payload = url.pathname.startsWith('/v4/') ? { alias: 'ai-sport-api.vercel.app', projectId: 'api', deploymentId: 'dpl_actual', deployment: { id: 'dpl_actual', url: 'actual-served-api.vercel.app' } } :
        { projectId: 'api', id: 'dpl_actual', url: 'actual-served-api.vercel.app', readyState: 'READY', meta: { sourceRevision: oldRevision } };
      return new Response(JSON.stringify(payload));
    }
    publicCalls += 1; assert.equal(url.hostname, 'ai-sport-api.vercel.app');
    assert.equal(options.headers.Authorization, undefined); assert.equal(options.headers['x-vercel-protection-bypass'], undefined);
    return new Response(JSON.stringify(aliasHealthPayload(oldRevision)), { headers: { 'content-type': 'application/json' } });
  });
  const reference = await provider.previousDeployment('api');
  assert.equal(reference.url, 'https://actual-served-api.vercel.app'); assert.equal(reference.revision, oldRevision); assert.equal(reference.servedRevisionVerified, true);
  assert.deepEqual(paths, ['/v4/aliases/ai-sport-api.vercel.app', '/v13/deployments/dpl_actual']); assert.equal(publicCalls, 1);
  assert.equal(paths.some((path) => path.includes('/v9/projects/')), false);
});

test('alias references refuse foreign project bindings, unqualified metadata and a revision not actually served', async () => {
  for (const change of ['alias_project', 'alias_name', 'deployment_id', 'deployment_project', 'deployment_url', 'metadata_revision', 'served_revision']) {
    const provider = new VercelProduction(env, async () => new Response(JSON.stringify(aliasHealthPayload(change === 'served_revision' ? 'c'.repeat(40) : oldRevision)), { headers: { 'content-type': 'application/json' } }));
    provider.request = async (path) => {
      if (path.startsWith('/v4/')) return { alias: change === 'alias_name' ? 'foreign.example.test' : 'ai-sport-api.vercel.app', projectId: change === 'alias_project' ? 'foreign' : 'api', deploymentId: 'dpl_actual', deployment: { id: change === 'deployment_id' ? 'dpl_other' : 'dpl_actual', url: 'actual-api.vercel.app' } };
      return { id: 'dpl_actual', projectId: change === 'deployment_project' ? 'foreign' : 'api', url: change === 'deployment_url' ? 'other-api.vercel.app' : 'actual-api.vercel.app', readyState: 'READY', meta: { sourceRevision: change === 'metadata_revision' ? 'main' : oldRevision } };
    };
    await assert.rejects(provider.previousDeployment('api'));
  }
});

test('alias convergence retries only a healthy known previous SHA, keeping unique candidate URLs strict', async () => {
  let requests = 0; const delays = [];
  const health = (url, expected) => checkReleaseHealth(url, expected, { fetcher: async () => {
    requests += 1;
    return new Response(JSON.stringify(aliasHealthPayload(requests < 3 ? oldRevision : revision)), { headers: { 'content-type': 'application/json' } });
  } });
  const result = await checkAliasConvergence('https://ai-sport-api.vercel.app/health/ready', { service: 'alcide-api', status: 'ready', revision }, {
    previousRevision: oldRevision, health, pause: async (ms) => delays.push(ms), now: () => 0,
  });
  assert.equal(result.complete, true); assert.equal(result.revision, revision); assert.equal(result.attempts, 3); assert.deepEqual(delays, [1000, 2000]);
  await assert.rejects(checkAliasConvergence('https://unique-candidate.vercel.app/health/ready', { service: 'alcide-api', status: 'ready', revision }, { previousRevision: oldRevision }), /reference_required/);
  requests = 0;
  await assert.rejects(health('https://unique-candidate.vercel.app/health/ready', { service: 'alcide-api', status: 'ready', revision }), /health_revision_mismatch/);
  assert.equal(requests, 1);
});

test('persistent old alias SHA times out with bounded safe provenance; wrong artifacts and application failures never retry', async () => {
  for (const scenario of ['old', 'third_sha', '500', 'invalid_json', 'stale', 'not_ready']) {
    let requests = 0; const delays = []; let failure;
    try {
      await checkAliasConvergence('https://ai-sport-api.vercel.app/health/ready', { service: 'alcide-api', status: 'ready', revision }, {
        previousRevision: oldRevision, pause: async (ms) => delays.push(ms), now: () => 0,
        health: (url, expected) => checkReleaseHealth(url, expected, { fetcher: async () => {
          requests += 1;
          const payload = aliasHealthPayload(scenario === 'third_sha' ? 'c'.repeat(40) : oldRevision,
            scenario === 'stale' ? { timestamp: '2020-01-01T00:00:00Z' } : scenario === 'not_ready' ? { checks: { database: 'ok', schema: 'missing', aiConfiguration: 'ok' } } : {});
          return new Response(scenario === 'invalid_json' ? '{private-invalid-json' : JSON.stringify(payload), { status: scenario === '500' ? 500 : 200, headers: { 'content-type': 'application/json' } });
        } }),
      }); assert.fail('unqualified alias must fail');
    } catch (error) { failure = safeReleaseFailure(error, 'api_alias_health'); }
    if (scenario === 'old') { assert.equal(requests, 8); assert.deepEqual(delays, [1000, 2000, 4000, 8000, 15000, 15000, 15000]); assert.equal(failure.reason, 'alias_convergence_timeout'); assert.equal(failure.aliasConvergence.waitedMs, 60000); }
    else { assert.equal(requests, 1); assert.deepEqual(delays, []); }
    if (scenario === '500') assert.equal(failure.httpStatus, 500);
    assert.equal(JSON.stringify(failure).includes('private-invalid-json'), false);
  }
});

test('alias assignment can converge only from its captured predecessor, never a third deployment', async () => {
  const provider = new VercelProduction(env); const delays = []; let reads = 0;
  provider.aliasDeployment = async () => ({ url: ++reads < 3 ? 'https://old-api.vercel.app' : 'https://new-api.vercel.app' });
  const result = await checkAliasConvergence('https://ai-sport-api.vercel.app/health/ready', { service: 'alcide-api', status: 'ready', revision }, {
    previousRevision: oldRevision, health: async () => {}, pause: async (ms) => delays.push(ms), now: () => 0,
    verifyAssignment: () => provider.verifyAliasDeployment('api', 'https://new-api.vercel.app', 'https://old-api.vercel.app'),
  });
  assert.equal(result.complete, true); assert.deepEqual(delays, [1000, 2000]);
  provider.aliasDeployment = async () => ({ url: 'https://foreign-api.vercel.app' });
  await assert.rejects(provider.verifyAliasDeployment('api', 'https://new-api.vercel.app', 'https://old-api.vercel.app'), /alias_deployment_mismatch/);
});

test('an old alias assignment cannot hide a runtime 500, invalid JSON or a third SHA behind retries', async () => {
  for (const scenario of ['500', 'invalid_json', 'third_sha']) {
    const provider = new VercelProduction(env); let assignments = 0; let healthCalls = 0; const waits = []; let failure;
    provider.aliasDeployment = async () => { assignments += 1; return { url: 'https://old-api.vercel.app' }; };
    try {
      await checkAliasConvergence('https://ai-sport-api.vercel.app/health/ready', { service: 'alcide-api', status: 'ready', revision }, {
        previousRevision: oldRevision, pause: async (ms) => waits.push(ms), now: () => 0,
        verifyAssignment: () => provider.verifyAliasDeployment('api', 'https://new-api.vercel.app', 'https://old-api.vercel.app'),
        health: (url, expected) => checkReleaseHealth(url, expected, { fetcher: async () => {
          healthCalls += 1;
          return new Response(scenario === 'invalid_json' ? '{private-broken-json' : JSON.stringify(aliasHealthPayload(scenario === 'third_sha' ? 'c'.repeat(40) : oldRevision)), {
            status: scenario === '500' ? 500 : 200, headers: { 'content-type': 'application/json' },
          });
        } }),
      }); assert.fail('an old metadata assignment must not qualify an unhealthy runtime');
    } catch (error) { failure = safeReleaseFailure(error, 'api_alias_health'); }
    assert.equal(assignments, 1); assert.equal(healthCalls, 1); assert.deepEqual(waits, []);
    assert.notEqual(failure.reason, 'alias_convergence_timeout');
    if (scenario === '500') assert.equal(failure.httpStatus, 500);
    if (scenario === 'third_sha') assert.equal(failure.reason, 'health_revision_mismatch');
    assert.equal(JSON.stringify(failure).includes('private-broken-json'), false);
  }
});

test('mixed old/new metadata and runtime observations wait until both identify the candidate', async () => {
  for (const scenario of ['old_assignment_new_health', 'new_assignment_old_health', 'both_old']) {
    const provider = new VercelProduction(env); let assignments = 0; let healthCalls = 0; const waits = [];
    provider.aliasDeployment = async () => ({ url: ++assignments === 1 && scenario !== 'new_assignment_old_health' ? 'https://old-api.vercel.app' : 'https://new-api.vercel.app' });
    const result = await checkAliasConvergence('https://ai-sport-api.vercel.app/health/ready', { service: 'alcide-api', status: 'ready', revision }, {
      previousRevision: oldRevision, pause: async (ms) => waits.push(ms), now: () => 0,
      verifyAssignment: () => provider.verifyAliasDeployment('api', 'https://new-api.vercel.app', 'https://old-api.vercel.app'),
      health: (url, expected) => checkReleaseHealth(url, expected, { fetcher: async () => {
        const served = ++healthCalls === 1 && scenario !== 'old_assignment_new_health' ? oldRevision : revision;
        return new Response(JSON.stringify(aliasHealthPayload(served)), { headers: { 'content-type': 'application/json' } });
      } }),
    });
    assert.equal(result.complete, true); assert.equal(result.attempts, 2); assert.equal(assignments, 2); assert.equal(healthCalls, 2); assert.deepEqual(waits, [1000]);
  }
});

test('alias convergence honors the wall-clock deadline including probe duration', async () => {
  let clock = 0; const delays = []; let requests = 0; let failure;
  try {
    await checkAliasConvergence('https://ai-sport-api.vercel.app/health/ready', { service: 'alcide-api', status: 'ready', revision }, {
      previousRevision: oldRevision, now: () => clock, pause: async (ms) => { delays.push(ms); clock += ms; },
      health: (url, expected) => checkReleaseHealth(url, expected, { fetcher: async () => {
        clock += 45_000; requests += 1;
        return new Response(JSON.stringify(aliasHealthPayload(oldRevision)), { headers: { 'content-type': 'application/json' } });
      } }),
    });
  } catch (error) { failure = safeReleaseFailure(error, 'api_alias_health'); }
  assert.equal(requests, 2); assert.deepEqual(delays, [1000]); assert.equal(failure.reason, 'alias_convergence_timeout');
  assert.deepEqual(failure.aliasConvergence, { attempts: 2, waitedMs: 1000, elapsedMs: 91000, deadlineMs: 90000, previousRevisionObserved: true, previousAssignmentObserved: false });
});

const liveEnv = () => ({ ...env, RELEASE_MODE: 'update', UPDATE_CONFIRM: 'preserve-live-admin-production',
  BACKUP_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'), GITHUB_TOKEN: 'private-gh-token', GITHUB_REPOSITORY: 'owner/project' });
const liveConfiguration = () => {
  const config = configuration();
  for (const vars of [config.api, config.web]) {
    vars.PRODUCTION_ACCESS_MODE = { value: 'admin-only' }; vars.ADMIN_EMAILS = { value: env.BOOTSTRAP_ADMIN_EMAIL };
  }
  config.api.ALCIDE_DATABASE_URL = { value: directSourceUrl(source.replace('/legacy', `/${env.TARGET_DATABASE_NAME}`)).value };
  config.api.BOOTSTRAP_ADMIN_USER_ID = { value: privateAdminId };
  return { ...config, source: config.api.ALCIDE_DATABASE_URL.value, applicationOverrideSelected: true, ready: true };
};
function liveProvider(config = liveConfiguration()) {
  return { ...providerFixture(), snapshot: async (project) => config[project] };
}
const ciSuccess = async () => ({ ok: true, json: async () => ({ workflow_runs: [{ id: 23, head_sha: revision, event: 'push', status: 'completed', conclusion: 'success' }] }) });
async function currentMigrationProof() {
  const count = (await readCandidateLineage()).length;
  return { complete: true, sameDatabase: true, fullDataPreserved: true, existingCatalogPreserved: true,
    oldDeploymentSchemaCompatible: true, ownerGooglePreserved: true, appliedMigrationsBefore: count, appliedMigrationsAfter: count, suffix: [],
    pilotClosed: { complete: true, enabled: false, activations: 0, invitations: 0, admissions: 0, attempts: 0 } };
}
const preservedLiveData = () => ({
  users: [{ id: privateAdminId, email: env.BOOTSTRAP_ADMIN_EMAIL }],
  accounts: [{ user_id: privateAdminId, type: 'oidc', provider: 'google', provider_account_id: 'private-real-subject-fixture' }],
  workouts: [{ id: 'workout-fixture', user_id: privateAdminId, completed: true }],
  training_programs: [{ id: 'program-fixture', user_id: privateAdminId }],
  session_logs: [{ id: 'session-fixture' }], user_settings: [{ user_id: privateAdminId, generatedWorkouts: 1, generatedPrograms: 2 }],
});
async function liveVerifierFixture({ state = preservedLiveData(), database = env.TARGET_DATABASE_NAME, lineageChange, queries = [] } = {}) {
  const candidates = await readCandidateLineage();
  const applied = candidates.map((row) => ({ hash: row.hash, created_at: String(row.createdAt) }));
  lineageChange?.(applied);
  return { state, queries, verifier: (input, config) => verifyLiveAdminProduction(input, config, { clientFactory: () => ({
    connect: async () => {}, end: async () => { queries.push('end'); },
    query: async (sql) => {
      queries.push(sql);
      if (sql === 'begin isolation level repeatable read read only' || sql === 'rollback') return { rows: [] };
      if (sql === 'select current_database() as database') return { rows: [{ database }] };
      if (sql.includes('to_regclass')) return { rows: [{ registry: 'drizzle.__drizzle_migrations' }] };
      if (sql === 'select hash, created_at from drizzle.__drizzle_migrations order by created_at asc, id asc') return { rows: applied };
      if (sql === 'select id, email from public.users limit 2') return { rows: state.users.slice(0, 2) };
      if (sql === 'select user_id, type, provider, provider_account_id from public.accounts limit 2') return { rows: state.accounts.slice(0, 2) };
      if (sql.includes('from public.pilot_control')) return { rows: [{ controls: 0, invitations: 0, admissions: 0, attempts: 0 }] };
      assert.fail(`Unexpected SQL in read-only live update: ${sql}`);
    },
  }) }) };
}

test('only the reviewed additive suffix is accepted, preserving the original applied hashes', async () => {
  const candidates = await readCandidateLineage(); assert.equal(candidates.length, 16);
  const plan = await readAdditiveUpdatePlan({ compatible: true, appliedMigrations: 13, matchedPrefix: 13, pendingMigrations: 3 });
  assert.equal(plan.migrations.length, 3); assert.equal(plan.migrations[0].statements.length, 27);
  assert.deepEqual(plan.suffix, candidates.slice(13));
  assert.equal(plan.suffix[0].tag, '0013_restore_september_product');
  const fixture = await liveVerifierFixture({ lineageChange: (applied) => { applied.splice(13); } });
  const verified = await fixture.verifier(liveEnv(), liveConfiguration());
  assert.equal(verified.evidence.appliedMigrations, 13); assert.equal(verified.evidence.pendingMigrations, 3);
  assert.deepEqual(verified.evidence.additiveSuffix, plan.suffix);
  assert.equal(fixture.queries.some((sql) => /^(create|alter|insert|update|delete|drop)/i.test(sql)), false);
});

test('additive SQL grammar rejects data changes, destructive DDL, executable defaults and old-table constraints/indexes', () => {
  for (const sql of [
    'DROP TABLE users;', 'UPDATE users SET email = \'other@example.test\';', 'DELETE FROM accounts;',
    'INSERT INTO admin_tracking(id) VALUES (\'default\');', 'ALTER TABLE users ALTER COLUMN id TYPE text;',
    'ALTER TABLE users ADD COLUMN required text NOT NULL;', 'ALTER TABLE users ADD COLUMN counter integer DEFAULT 0;',
    'ALTER TABLE users ADD CONSTRAINT new_fk FOREIGN KEY (id) REFERENCES public.accounts (user_id);',
    'CREATE INDEX old_idx ON users (email);', 'CREATE TABLE example AS SELECT * FROM users;',
    'CREATE TABLE example (id uuid DEFAULT evil_function());', 'CREATE TABLE example (id text DEFAULT set_config(\'x\',\'y\',false));',
    'CREATE TABLE example (id timestamp DEFAULT evil.now());',
    'CREATE TABLE example (id text DEFAULT \'x\'::evil_type);', 'CREATE TABLE example (id evil_type);',
    'CREATE TABLE example (id uuid GENERATED ALWAYS AS IDENTITY);', 'DO $$ begin delete from users; end $$;',
    'CREATE TABLE example (id text); /* comment */ DROP TABLE users;',
    'CREATE TABLE example (id text DEFAULT \'value;\'); DROP TABLE users;',
    'CREATE TABLE example (id text) TABLESPACE external;', 'CREATE TABLE example (id text) INHERITS (users);',
    'CREATE TABLE example (id text); -- hidden SQL\nDROP TABLE users;', 'ALTER TABLE users ADD COLUMN suspended_at timestamp',
  ]) assert.throws(() => validateAdditiveMigrationSql(sql), /live_update/);
  const safe = validateAdditiveMigrationSql('CREATE TABLE "new_table" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "count" integer DEFAULT 0, CONSTRAINT "range" CHECK ("count" IN (0,1)));--> statement-breakpoint\nALTER TABLE "users" ADD COLUMN "suspended_at" timestamp with time zone;');
  assert.equal(safe.statements.length, 2);
});

test('pilot executable SQL is accepted only as the immutable reviewed artifact at its exact journal position', async () => {
  const sql = await readFile(new URL('../apps/api/drizzle/0015_pilot_protections.sql', import.meta.url), 'utf8');
  assert.equal(createHash('sha256').update(sql).digest('hex'), pinnedPilotMigration.hash);
  const accepted = validatePinnedPilotMigration(pinnedPilotMigration, sql);
  assert.equal(accepted.statements.length, 15);
  assert.deepEqual([...accepted.createdTables].sort(), [...pinnedPilotMigration.tables].sort());
  assert.equal(accepted.statements.filter((statement) => /CREATE FUNCTION/.test(statement)).length, 2);
  assert.equal(accepted.statements.filter((statement) => /CREATE TRIGGER/.test(statement)).length, 4);
  assert.throws(() => validateAdditiveMigrationSql(sql), /live_update/);
  for (const change of [{ tag: '0016_pilot_protections' }, { hash: 'a'.repeat(64) }, { createdAt: pinnedPilotMigration.createdAt + 1 }, { index: 14 }]) {
    assert.throws(() => validatePinnedPilotMigration({ ...pinnedPilotMigration, ...change }, sql), /pinned_pilot/);
  }
  for (const changedSql of [sql + '\n', sql.replace('CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION'),
    sql.replace('ON pilot_control FOR EACH ROW', 'ON users FOR EACH ROW'), sql.replace("interval '720 hours'", "interval '721 hours'"),
    sql + '\nINSERT INTO pilot_control VALUES (\'enabled\');', sql + '\nDROP TABLE users;']) {
    assert.notEqual(changedSql, sql);
    assert.throws(() => validatePinnedPilotMigration({ ...pinnedPilotMigration, hash: createHash('sha256').update(changedSql).digest('hex') }, changedSql), /pinned_pilot/);
    assert.throws(() => validatePinnedPilotMigration(pinnedPilotMigration, changedSql), /pinned_pilot/);
    assert.throws(() => validateAdditiveMigrationSql(changedSql), /live_update/);
  }
  for (const table of pinnedPilotMigration.tables) assert.throws(() => validatePinnedPilotMigration(pinnedPilotMigration, sql, new Set([table])), /duplicate_added_table/);
  assert.throws(() => { pinnedPilotMigration.hash = 'changed'; }, TypeError);
  assert.throws(() => pinnedPilotMigration.tables.push('users'), TypeError);
});

test('the fourteen previously deployed migrations keep their original SQL hashes, tags and timestamps', async () => {
  // Recorded from the unchanged origin/main baseline, not derived from this checkout.
  const baseline = (await readCandidateLineage()).slice(0, 14);
  assert.equal(createHash('sha256').update(JSON.stringify(baseline)).digest('hex'), '4958561b11e708f78dd4ec1f92f589979f3add95446383fba364d0a64164ceee');
});

test('the plan reader cannot authorize another pilot file by changing its SQL, name or journal timestamp', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'alcide-pinned-pilot-'));
  const folder = new URL(`file:///${directory.replaceAll('\\', '/')}/`);
  const journal = JSON.parse(await readFile(new URL('../apps/api/drizzle/meta/_journal.json', import.meta.url), 'utf8'));
  const original = await readFile(new URL('../apps/api/drizzle/0015_pilot_protections.sql', import.meta.url), 'utf8');
  try {
    await mkdir(join(directory, 'meta'));
    for (const entry of journal.entries) await writeFile(join(directory, `${entry.tag}.sql`), await readFile(new URL(`../apps/api/drizzle/${entry.tag}.sql`, import.meta.url)));
    const lineage = { compatible: true, appliedMigrations: 15, matchedPrefix: 15, pendingMigrations: 1 };
    for (const kind of ['exact', 'sql', 'name', 'timestamp']) {
      const fixture = structuredClone(journal);
      const entry = fixture.entries[15];
      if (kind === 'name') entry.tag = '0015_other_pilot';
      if (kind === 'timestamp') entry.when += 1;
      await writeFile(join(directory, `${entry.tag}.sql`), kind === 'sql' ? original + '\n' : original);
      await writeFile(join(directory, 'meta/_journal.json'), JSON.stringify(fixture));
      if (kind === 'exact') assert.deepEqual((await readAdditiveUpdatePlan(lineage, { folder })).suffix, [{ tag: pinnedPilotMigration.tag, hash: pinnedPilotMigration.hash, createdAt: pinnedPilotMigration.createdAt }]);
      else await assert.rejects(readAdditiveUpdatePlan(lineage, { folder }), /live_update/);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('a closed pilot proof requires every activation, invitation, admission and attempt count to be exactly zero', async () => {
  const empty = { controls: 0, invitations: 0, admissions: 0, attempts: 0 };
  assert.deepEqual(await verifyClosedPilotState({ query: async () => ({ rows: [empty] }) }), { complete: true, enabled: false, activations: 0, invitations: 0, admissions: 0, attempts: 0 });
  for (const field of Object.keys(empty)) for (const value of [1, '0', null]) {
    await assert.rejects(verifyClosedPilotState({ query: async () => ({ rows: [{ ...empty, [field]: value }] }) }), /pilot_not_closed/);
  }
  await assert.rejects(verifyClosedPilotState({ query: async () => ({ rows: [] }) }), /pilot_not_closed/);
});

test('additive migration commits only after catalog, all existing data and Google checks, and shares the production SQL lock', async () => {
  const plan = await readAdditiveUpdatePlan({ compatible: true, appliedMigrations: 13, matchedPrefix: 13, pendingMigrations: 3 });
  for (const scenario of ['success', 'data_change', 'catalog_change', 'google_change', 'wrong_proof', 'write_failure', 'lineage_failure', 'lock_busy', 'pilot_relations', 'pilot_functions', 'pilot_triggers', 'pilot_active']) {
    const statements = []; let inserted = 0; let reads = 0; let stateReads = 0;
    const before = { tables: [{ schema: 'public', name: 'users' }, { schema: 'public', name: 'user_settings' }],
      catalog: [{ schema: 'public', name: 'users', attname: 'id', type: 'uuid' }],
      constraints: [{ name: 'users_pk' }], indexes: [{ name: 'users_pk' }], triggers: [], policies: [],
      rows: [{ schema: 'public', name: 'users', rows: '1', digest: 'a'.repeat(64) }, { schema: 'public', name: 'user_settings', rows: '1', digest: 'b'.repeat(64) }] };
    const config = liveConfiguration(); let result; let error;
    try {
      result = await applyAdditiveLiveUpdate(liveEnv(), config, scenario === 'wrong_proof' ? { ...plan, suffix: [] } : plan, {
        clientFactory: (options) => {
          assert.equal(options.connectionString, config.source);
          return { connect: async () => {}, end: async () => statements.push('end'), query: async (sql, values) => {
            statements.push(sql);
            if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: scenario !== 'lock_busy' }] };
            if (sql === 'select current_database() as database') return { rows: [{ database: env.TARGET_DATABASE_NAME }] };
            if (sql === 'select id, email from public.users limit 2') return { rows: preservedLiveData().users };
            if (sql === 'select user_id, type, provider, provider_account_id from public.accounts limit 2') {
              reads += 1; return { rows: scenario === 'google_change' && reads > 1 ? [] : preservedLiveData().accounts };
            }
            if (sql.startsWith('insert into drizzle')) { assert.deepEqual(values, [plan.suffix[inserted].hash, plan.suffix[inserted].createdAt]); inserted += 1; }
            if (sql.includes('from pg_proc')) return { rows: [{ relations: Number(scenario === 'pilot_relations'), functions: Number(scenario === 'pilot_functions'), triggers: Number(scenario === 'pilot_triggers') }] };
            if (sql.includes('from public.pilot_control')) return { rows: [{ controls: Number(scenario === 'pilot_active'), invitations: 0, admissions: 0, attempts: 0 }] };
            if (scenario === 'write_failure' && /^\s*CREATE TABLE/.test(sql)) throw Object.assign(new Error('private-db-row-and-url'), { code: '42501' });
            return { rows: [] };
          } };
        },
        lineageInspector: async () => ({ compatible: true, appliedMigrations: 13 + inserted, matchedPrefix: 13 + inserted, pendingMigrations: inserted === 3 && scenario !== 'lineage_failure' ? 0 : 3 }),
        planReader: async () => plan,
        stateReader: async (_client, previous) => {
          stateReads += 1; const state = structuredClone(before);
          if (previous) {
            assert.deepEqual(previous, before);
            state.catalog.push({ schema: 'public', name: 'users', attname: 'suspended_at', type: 'timestamp' });
            if (scenario === 'data_change') state.rows[1].digest = 'c'.repeat(64);
            if (scenario === 'catalog_change') state.catalog[0].type = 'text';
          }
          return state;
        }, pause: async () => {},
      });
    } catch (caught) { error = caught; }
    if (scenario === 'success') {
      assert.equal(error, undefined); assert.equal(result.complete, true); assert.equal(result.oldDeploymentSchemaCompatible, true);
      assert.equal(result.fullDataPreserved, true); assert.deepEqual(result.suffix, plan.suffix); assert.equal(statements.includes('commit'), true); assert.equal(stateReads, 2);
      assert.equal(result.pilotClosed.complete, true); assert.equal(result.pilotClosed.invitations, 0);
      assert.equal(JSON.stringify(result).includes('private'), false); assert.equal(JSON.stringify(result).includes(privateAdminId), false);
    } else {
      assert.ok(error, scenario); assert.equal(statements.includes('commit'), false);
      if (scenario !== 'lock_busy') assert.equal(statements.includes('rollback'), true);
      if (scenario === 'wrong_proof' || scenario === 'lock_busy') assert.equal(statements.some((sql) => sql.includes('CREATE TABLE')), false);
      if (['pilot_relations', 'pilot_functions', 'pilot_triggers'].includes(scenario)) assert.equal(statements.some((sql) => sql.includes('CREATE TABLE')), false);
      const failure = safeReleaseFailure(error, 'additive_live_migration'); assert.equal(JSON.stringify(failure).includes('private-db-row'), false);
    }
    assert.equal(statements[0], 'select pg_try_advisory_lock(1946010371, 1) as locked');
    assert.equal(statements.at(-1), 'end');
    if (scenario !== 'lock_busy') assert.equal(statements.at(-2), 'select pg_advisory_unlock(1946010371, 1)');
  }
});

test('live update requires its distinct confirmation and rejects seed reuse', () => {
  assert.equal(validateReleaseInput(liveEnv()), 'update');
  assert.throws(() => validateReleaseInput({ ...liveEnv(), UPDATE_CONFIRM: '', BOOTSTRAP_CONFIRM: 'selective-admin-copy-to-new-database' }), /live_update_confirmation/);
  assert.throws(() => validateReleaseInput({ ...liveEnv(), BOOTSTRAP_REUSE_EXISTING: 'verified-admin-copy' }), /does_not_use_seed_reuse/);
});

test('live update verifies the exact candidate lineage and Google owner using only read-only SQL, preserving history and usage', async () => {
  const fixture = await liveVerifierFixture(); const before = structuredClone(fixture.state);
  const verified = await fixture.verifier(liveEnv(), liveConfiguration());
  assert.equal(verified.adminId, privateAdminId); assert.equal(verified.evidence.existingLiveTargetVerified, true);
  assert.equal(verified.evidence.googleAccountsVerified, 1); assert.equal(verified.evidence.pendingMigrations, 0);
  assert.deepEqual(fixture.state, before);
  assert.equal(fixture.queries[0], 'begin isolation level repeatable read read only');
  assert.equal(fixture.queries.at(-2), 'rollback'); assert.equal(fixture.queries.at(-1), 'end');
  assert.ok(fixture.queries.every((sql) => /^(select\s|begin isolation level repeatable read read only$|rollback$|end$)/.test(sql)));
  for (const value of [privateAdminId, env.BOOTSTRAP_ADMIN_EMAIL, 'private-real-subject-fixture', 'private_password']) assert.equal(JSON.stringify(verified.evidence).includes(value), false);
  fixture.state.accounts = [];
  assert.equal((await fixture.verifier(liveEnv(), liveConfiguration())).evidence.googleAccountsVerified, 0);
});

test('live update refuses missing or ambiguous live configuration before opening a SQL connection', async () => {
  const changes = [
    (config) => { delete config.api.ALCIDE_DATABASE_URL; },
    (config) => { config.api.ALCIDE_DATABASE_URL.value = ''; },
    (config) => { config.applicationOverrideSelected = false; },
    (config) => { config.api.ALCIDE_DATABASE_URL.value = source; },
    (config) => { config.source = directSourceUrl(source).value; config.api.ALCIDE_DATABASE_URL.value = config.source; },
    (config) => { config.api.PRODUCTION_ACCESS_MODE.value = 'public'; },
    (config) => { config.web.PRODUCTION_ACCESS_MODE.value = 'public'; },
    (config) => { config.api.ADMIN_EMAILS.value += ',other@example.test'; },
    (config) => { config.web.ADMIN_EMAILS.value = 'other@example.test'; },
    (config) => { config.api.BOOTSTRAP_ADMIN_USER_ID.value = ''; },
  ];
  for (const change of changes) {
    const config = liveConfiguration(); change(config);
    await assert.rejects(verifyLiveAdminProduction(liveEnv(), config, { clientFactory: () => assert.fail('invalid config connected to SQL') }), /live_update/);
  }
  const provider = liveProvider(); provider.snapshot = async (project) => configuration()[project];
  await assert.rejects(inspectConfiguration(liveEnv(), provider), /application_database_required/);
});

test('live update blocks SQL database, owner, accounts and unsafe or divergent migration suffixes without writes', async () => {
  const scenarios = [
    { database: 'other_database' },
    { mutate: (data) => { data.users = []; } },
    { mutate: (data) => { data.users.push({ id: 'other', email: 'other@example.test' }); } },
    { mutate: (data) => { data.users[0].id = 'different-private-owner'; } },
    { mutate: (data) => { data.users[0].email = 'other@example.test'; } },
    { mutate: (data) => { data.accounts[0].user_id = 'different-private-owner'; } },
    { mutate: (data) => { data.accounts[0].provider = 'credentials'; } },
    { mutate: (data) => { data.accounts[0].type = 'credentials'; } },
    { mutate: (data) => { data.accounts[0].provider_account_id = ''; } },
    { mutate: (data) => { data.accounts.push({ ...data.accounts[0] }); } },
    { lineageChange: (applied) => { applied.splice(12); } },
    { lineageChange: (applied) => { applied[0].hash = 'divergent'; } },
    { lineageChange: (applied) => { applied.push({ hash: 'unknown', created_at: '9999999999999' }); } },
  ];
  for (const scenario of scenarios) {
    const state = preservedLiveData(); scenario.mutate?.(state);
    const before = structuredClone(state); const fixture = await liveVerifierFixture({ ...scenario, state });
    await assert.rejects(fixture.verifier(liveEnv(), liveConfiguration()), /live_update/);
    assert.deepEqual(state, before); assert.equal(fixture.queries.at(-1), 'end');
    assert.ok(fixture.queries.every((sql) => !/^(create|insert|delete|update|alter|drop)/i.test(sql)));
  }
});

test('live update prepare requires exact CI and backs up the active URL without calling selective bootstrap', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'alcide-live-prepare-'));
  const fixture = await liveVerifierFixture(); const config = liveConfiguration(); const before = structuredClone(fixture.state); const calls = [];
  const input = { ...liveEnv(), RELEASE_DIRECTORY: directory, PUBLISHER_CONFIRM: 'publish-provided-required-notices', LEGAL_PUBLISHER_JSON: JSON.stringify(publisherFixture()) };
  try {
    const deps = { provider: liveProvider(config), fetcher: ciSuccess, liveVerifier: fixture.verifier,
      bootstrap: async () => assert.fail('live update must not call bootstrap'),
      identityReader: async (url) => { assert.equal(url, config.source); return { sourceIdentity: 'private-identity', databaseMajor: 17 }; },
      backupRunner: async (scriptName, child) => { calls.push('backup'); assert.equal(child.LEGAL_PUBLISHER_JSON, undefined); assert.equal(scriptName, 'db-backup.mjs'); assert.equal(child.DATABASE_URL, config.source); assert.equal(child.PG_TOOLS_DOCKER_IMAGE, 'postgres:17-alpine'); assert.equal(child.BACKUP_ENCRYPTION_KEY, input.BACKUP_ENCRYPTION_KEY); },
      rehearsalRunner: async (child, _directory, url, _identity, _bootstrap, options) => { calls.push('restore'); assert.equal(child.LEGAL_PUBLISHER_JSON, undefined); assert.deepEqual(options.liveConfiguration.publisherValues, publisherFixture()); assert.equal(child.RELEASE_MODE, 'update'); assert.equal(url, config.source); assert.equal(options.liveConfiguration.source, url); return { fullRestoreVerified: true, selectiveCopyPerformed: false }; },
    };
    const result = await runProductionAdminRelease(input, deps);
    assert.equal(result.complete, true); assert.equal(result.phase, 'prepared'); assert.equal(result.existingLiveTargetVerified, true);
    assert.equal(result.legalPublisher.requested, true); assert.equal(result.legalPublisher.applied, undefined);
    for (const value of Object.values(publisherFixture())) assert.equal(JSON.stringify(result).includes(value), false);
    assert.equal(result.bootstrap, undefined); assert.equal(result.adminCopyVerified, undefined); assert.deepEqual(calls, ['backup', 'restore']); assert.deepEqual(fixture.state, before);
    calls.length = 0;
    const refused = await runProductionAdminRelease(input, { ...deps, fetcher: async () => ({ ok: true, json: async () => ({ workflow_runs: [] }) }) });
    assert.equal(refused.complete, false); assert.equal(refused.failure.failedStage, 'ci_verification'); assert.deepEqual(calls, []);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('live update stages the same database and UUID, preserves real history and Google account, and retains rollback', async () => {
  for (const failsHealth of [false, true]) {
    const fixture = await liveVerifierFixture(); const before = structuredClone(fixture.state); const config = liveConfiguration();
    const provider = liveProvider(config); const writes = []; let undone = 0; let promoted = 0;
    provider.replace = async (project, _old, key, value, undo) => { writes.push({ project, key, value }); undo.push(async () => { undone += 1; }); };
    const result = await deployClosedProduction(liveEnv(), config, provider, {
      liveVerifier: fixture.verifier, bootstrap: async () => assert.fail('selective bootstrap in live update'), selectedAdminId: async () => assert.fail('bootstrap identity lookup in live update'),
      verifyConfiguration: async () => {}, artifactInspector: async () => ({}), functionEnvironmentBinder: mockFunctionBinder,
      cleanup: async () => {}, denied: async () => {}, oauthConfiguration: async () => ({ canonicalCallbackVerified: true }),
      command: (_command, args, child) => {
        if (args.includes('promote')) promoted += 1;
        if (child.VERCEL_PROJECT_ID === 'api') { assert.equal(child.ALCIDE_DATABASE_URL, config.source); assert.equal(child.DATABASE_URL, config.source); assert.equal(child.BOOTSTRAP_ADMIN_USER_ID, privateAdminId); }
        return args.includes('deploy') ? `https://${child.VERCEL_PROJECT_ID}-live-update.vercel.app` : '';
      },
      health: async () => { if (failsHealth) throw new Error('Health HTTP 503'); },
    });
    assert.deepEqual(fixture.state, before); assert.equal(result.complete, !failsHealth); assert.equal(result.bootstrap, undefined); assert.equal(result.adminCopyVerified, undefined);
    assert.equal(writes.find((write) => write.key === 'ALCIDE_DATABASE_URL').value, config.source);
    if (failsHealth) { assert.equal(promoted, 0); assert.equal(result.rollbackComplete, true); assert.equal(result.existingDatabaseRetained, true); assert.equal(result.newDatabaseRetained, false); assert.equal(undone, writes.length); }
    else { assert.equal(promoted, 2); assert.equal(result.existingLiveTargetVerified, true); assert.equal(result.liveTarget.googleAccountsVerified, 1); }
    for (const value of [privateAdminId, env.BOOTSTRAP_ADMIN_EMAIL, 'private-real-subject-fixture', 'private_password']) assert.equal(JSON.stringify(result).includes(value), false);
  }
});

test('live update rehearsal restores all live tables before an optional additive migration and never copies admin selectively', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'alcide-live-restore-'));
  const input = { ...liveEnv(), ADMIN_IMPORT_POLICY: 'account-only', BACKUP_FILE: join(directory, 'release.dump') };
  const identity = { sourceIdentity: 'fixture-source-identity', databaseMajor: 17 };
  const config = liveConfiguration(); const original = preservedLiveData(); const before = structuredClone(original); let restored;
  const commands = []; const fingerprint = await migrationFingerprint();
  const plan = await readAdditiveUpdatePlan({ compatible: true, appliedMigrations: 13, matchedPrefix: 13, pendingMigrations: 3 });
  try {
    await writeFile(`${input.BACKUP_FILE}.enc`, 'encrypted-placeholder');
    await writeFile(`${input.BACKUP_FILE}.manifest.json`, JSON.stringify({ migrationFingerprint: fingerprint, dumpSha256: 'f'.repeat(64) }));
    const proof = await rehearse(input, directory, config.source, identity, async () => assert.fail('selective copy in full restore'), {
      liveConfiguration: config,
      migrationRunner: async (_child, localConfig, expected) => {
        assert.deepEqual(restored, before); assert.equal(new URL(localConfig.source).hostname, '127.0.0.1');
        assert.deepEqual(expected.suffix, plan.suffix); assert.equal(expected.appliedMigrationsBefore, 13);
        return { ...await currentMigrationProof(), appliedMigrationsBefore: 13, suffix: plan.suffix };
      },
      command: (tool, args, child) => {
        commands.push(args[0]); assert.equal(tool, 'docker');
        if (args[0] === 'run') { assert.ok(args.includes('postgres:17-alpine')); assert.equal(args.includes(child.POSTGRES_PASSWORD), false); }
        return args[0] === 'port' ? '127.0.0.1:54329\n' : '';
      },
      identityReader: async (url) => { assert.equal(new URL(url).hostname, '127.0.0.1'); return { databaseMajor: 17 }; },
      restoreRunner: async (name, child) => {
        assert.equal(name, 'db-restore-check.mjs'); assert.equal(child.RESTORE_APPLY_CANDIDATE_MIGRATIONS, '0');
        assert.equal(child.RESTORE_CONFIRM, 'isolated-empty-database'); assert.equal(new URL(child.RESTORE_DATABASE_URL).pathname, '/restore_source');
        // The restore boundary carries the complete snapshot, including paid usage
        // and history; no account-only projection is used in this mode.
        restored = structuredClone(original);
        await writeFile(child.RESTORE_EVIDENCE_FILE, JSON.stringify({ result: 'passed', encrypted: true, rowCountsMatch: true,
          candidateMigrationsApplied: false, candidateRevision: revision, sourceIdentity: identity.sourceIdentity,
          dumpSha256: 'f'.repeat(64), tablesVerified: Object.keys(restored).length }));
      },
      liveVerifier: async (child, localConfig) => {
        assert.deepEqual(restored, before); assert.equal(child.TARGET_DATABASE_NAME, 'restore_source');
        assert.equal(localConfig.source, localConfig.api.ALCIDE_DATABASE_URL.value);
        const fixture = await liveVerifierFixture({ state: restored, database: 'restore_source', lineageChange: (applied) => { applied.splice(13); } });
        return fixture.verifier(child, localConfig);
      },
    });
    assert.deepEqual(original, before); assert.deepEqual(restored, before); assert.deepEqual(commands, ['run', 'port', 'rm']);
    assert.equal(proof.releaseMode, 'update'); assert.equal(proof.fullRestoreVerified, true); assert.equal(proof.selectiveCopyPerformed, false);
    assert.equal(proof.fullRestoreEvidenceSha256, await fileHash(join(directory, 'restore.json')));
    assert.deepEqual(proof.additiveMigrationRehearsal.suffix, plan.suffix); assert.equal(proof.additiveMigrationRehearsal.appliedMigrationsAfter, 16);
    assert.equal(proof.adminCopyVerified, undefined); assert.equal(proof.selectiveCopyVerified, undefined); assert.equal(proof.isolatedTargetCreated, undefined);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('live update full restoration proof is hash-bound to backup, revision, lineage and unchanged table counts', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'alcide-live-proof-'));
  const input = { ...liveEnv(), ADMIN_IMPORT_POLICY: 'account-only', BACKUP_FILE: join(directory, 'release.dump') };
  const identity = { sourceIdentity: 'fixture-source-identity', databaseMajor: 17 };
  const fingerprint = await migrationFingerprint();
  try {
    await writeFile(`${input.BACKUP_FILE}.enc`, 'encrypted-placeholder');
    const sha = await fileHash(`${input.BACKUP_FILE}.enc`);
    const manifest = { encrypted: true, sourceIdentity: identity.sourceIdentity, databaseMajor: 17,
      candidateRevision: revision, migrationFingerprint: fingerprint, dumpSha256: 'f'.repeat(64), encryptedSha256: sha };
    const restore = { result: 'passed', encrypted: true, rowCountsMatch: true, candidateMigrationsApplied: false,
      sourceIdentity: identity.sourceIdentity, candidateRevision: revision, dumpSha256: manifest.dumpSha256, tablesVerified: 12 };
    await writeFile(`${input.BACKUP_FILE}.manifest.json`, JSON.stringify(manifest));
    await writeFile(join(directory, 'restore.json'), JSON.stringify(restore));
    const proof = { releaseMode: 'update', fullRestoreVerified: true, existingLiveTargetVerified: true,
      additiveMigrationRehearsal: await currentMigrationProof(),
      selectiveCopyPerformed: false, dataPreserved: true, restoredCountsMatch: true, revision, targetDatabaseName: input.TARGET_DATABASE_NAME,
      sourceIdentity: identity.sourceIdentity, migrationFingerprint: fingerprint, encryptedSha256: sha,
      fullRestoreEvidenceSha256: await fileHash(join(directory, 'restore.json')), performedAt: new Date().toISOString() };
    const verify = () => verifyPreparedBackup(input, directory, liveConfiguration().source, { identityReader: async () => identity });
    await writeFile(join(directory, 'rehearsal.json'), JSON.stringify(proof)); await verify();
    await writeFile(join(directory, 'rehearsal.json'), JSON.stringify({ ...proof, additiveMigrationRehearsal: { ...proof.additiveMigrationRehearsal, suffix: [{ hash: 'wrong' }] } }));
    await assert.rejects(verify(), /rehearsed_suffix_mismatch/);
    for (const pilotClosed of [undefined, { complete: false }, { complete: true, enabled: true, activations: 0, invitations: 0, admissions: 0, attempts: 0 }, { complete: true, enabled: false, activations: 0, invitations: 1, admissions: 0, attempts: 0 }]) {
      await writeFile(join(directory, 'rehearsal.json'), JSON.stringify({ ...proof, additiveMigrationRehearsal: { ...proof.additiveMigrationRehearsal, pilotClosed } }));
      await assert.rejects(verify(), /pilot_closed_rehearsal_required/);
    }
    for (const changed of [{ releaseMode: 'deploy' }, { selectiveCopyVerified: true }, { selectiveCopyPerformed: true }, { fullRestoreVerified: false }, { fullRestoreEvidenceSha256: 'wrong' }]) {
      await writeFile(join(directory, 'rehearsal.json'), JSON.stringify({ ...proof, ...changed }));
      await assert.rejects(verify(), /fresh_backup_rehearsal/);
    }
    for (const changed of [{ rowCountsMatch: false }, { candidateMigrationsApplied: true }, { sourceIdentity: 'different' }, { candidateRevision: 'b'.repeat(40) }, { encrypted: false }]) {
      await writeFile(join(directory, 'restore.json'), JSON.stringify({ ...restore, ...changed }));
      await writeFile(join(directory, 'rehearsal.json'), JSON.stringify({ ...proof, fullRestoreEvidenceSha256: await fileHash(join(directory, 'restore.json')) }));
      await assert.rejects(verify(), /fresh_backup_rehearsal/);
    }
    await writeFile(join(directory, 'restore.json'), JSON.stringify(restore));
    await writeFile(join(directory, 'rehearsal.json'), JSON.stringify(proof));
    // An initial selective proof cannot be substituted for the live-data proof.
    await assert.rejects(verifyPreparedBackup({ ...input, RELEASE_MODE: 'deploy' }, directory, liveConfiguration().source, { identityReader: async () => identity }), /fresh_backup_rehearsal/);
    await writeFile(`${input.BACKUP_FILE}.enc`, 'tampered'); await assert.rejects(verify(), /fresh_backup_rehearsal/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('live update release validates a full restore proof before calling the shared deploy routine and skips bootstrap', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'alcide-live-release-'));
  const input = { ...liveEnv(), RELEASE_DIRECTORY: directory, RELEASE_PHASE: 'release' };
  const fixture = await liveVerifierFixture(); const config = liveConfiguration(); const calls = [];
  const deps = { provider: liveProvider(config), fetcher: ciSuccess, liveVerifier: fixture.verifier,
    bootstrap: async () => assert.fail('bootstrap during live update release'),
    preparedBackupVerifier: async (child, _directory, url) => { calls.push('verify-backup'); assert.equal(child.RELEASE_MODE, 'update'); assert.equal(url, config.source); return { additiveMigrationRehearsal: await currentMigrationProof() }; },
    migrationRunner: async (_child, current, expected) => { calls.push('migrate'); assert.equal(current.source, config.source); assert.deepEqual(expected.suffix, []); return currentMigrationProof(); },
    deploymentRunner: async (child, current, _provider, options) => { calls.push('deploy'); assert.equal(child.RELEASE_MODE, 'update'); assert.equal(current.source, config.source); assert.equal(options.liveVerifier, fixture.verifier); return { complete: true, existingLiveTargetVerified: true }; },
  };
  try {
    const result = await runProductionAdminRelease(input, deps);
    assert.equal(result.complete, true); assert.equal(result.bootstrap, undefined); assert.equal(result.adminCopyVerified, undefined); assert.deepEqual(calls, ['verify-backup', 'migrate', 'deploy']);
    calls.length = 0;
    const refused = await runProductionAdminRelease(input, { ...deps, preparedBackupVerifier: async () => { throw new Error('private-invalid-proof'); } });
    assert.equal(refused.complete, false); assert.equal(refused.failure.failedStage, 'prepared_backup_verification'); assert.deepEqual(calls, []);
    assert.equal(JSON.stringify(refused).includes('private-invalid-proof'), false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

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

test('application database configuration takes priority and an empty or invalid override never falls back', async () => {
  const vars = configuration(); const provider = providerFixture();
  provider.snapshot = async (project) => vars[project];
  vars.api.ALCIDE_DATABASE_URL = { value: source.replace('/legacy', '/application_selected') };
  const configured = await inspectConfiguration(env, provider);
  assert.equal(new URL(configured.source).pathname, '/application_selected'); assert.equal(configured.applicationOverrideSelected, true);
  for (const value of ['', 'private-invalid-url']) {
    vars.api.ALCIDE_DATABASE_URL = { value };
    await assert.rejects(inspectConfiguration(env, provider));
  }
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
    health: async () => assert.fail('health before deployment'), cleanup: async () => {}, verifyConfiguration: async () => {}, functionEnvironmentBinder: mockFunctionBinder, oauthConfiguration: async () => ({ canonicalCallbackVerified: true }),
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

test('promotion failure checks the untouched Web reference and reports incomplete API compensation', async () => {
  const provider = providerFixture(); const promotions = [];
  provider.replace = async (_project, _original, _key, _value, undo) => { undo.push(async () => {}); };
  let deployCount = 0;
  const result = await deployClosedProduction(env, { ...configuration(), source }, provider, {
    bootstrap: async () => ({ ...ready, targetCreated: true, adminCopyVerified: true }), selectedAdminId: async () => privateAdminId,
    cleanup: async () => {}, health: async () => {}, denied: async () => {}, verifyConfiguration: async () => {}, functionEnvironmentBinder: mockFunctionBinder, oauthConfiguration: async () => ({ canonicalCallbackVerified: true }),
    command: (_command, args) => {
      if (args.includes('deploy')) return `https://new-${deployCount++}.vercel.app\n`;
      if (args.includes('promote')) {
        promotions.push(args[args.indexOf('promote') + 1]);
        if (promotions.length === 1 || args.includes('https://old-api.vercel.app')) throw new Error('private failure');
      }
      return '';
    },
  });
  assert.deepEqual(promotions, ['https://new-0.vercel.app', 'https://old-api.vercel.app']);
  assert.equal(result.reason, 'release_failed_manual_rollback_required');
});

test('rollback verifies independent real alias revisions and restored settings, reporting each incomplete component', async () => {
  for (const scenario of ['complete', 'alias_command_fails', 'environment_mismatch']) {
    const original = configuration();
    original.api.APP_REVISION = { value: oldRevision }; original.web.APP_REVISION = { value: 'c'.repeat(40) };
    const current = structuredClone(original); const assignments = { api: 'https://old-api.vercel.app', web: 'https://old-web.vercel.app' };
    const promotions = []; const events = []; let webPromotionFailed = false;
    const provider = providerFixture();
    provider.previousDeployment = async (project) => ({ ...previousReference(project), revision: original[project].APP_REVISION.value });
    provider.verifyAliasDeployment = (project, expectedUrl, priorUrl) => VercelProduction.prototype.verifyAliasDeployment.call({ aliasDeployment: async () => ({ url: assignments[project] }) }, project, expectedUrl, priorUrl);
    provider.snapshot = async (project, keys) => Object.fromEntries(keys.map((key) => [key, current[project][key] ?? null]));
    provider.replace = async (project, _original, key, value, undo) => {
      const old = structuredClone(current[project][key]);
      undo.push(async () => {
        if (scenario === 'environment_mismatch' && project === 'api' && key === 'APP_REVISION') return;
        if (old === undefined) delete current[project][key]; else current[project][key] = old;
      });
      current[project][key] = { ...old, value };
    };
    const result = await deployClosedProduction(env, { ...original, source }, provider, {
      bootstrap: async () => ({ ...ready, targetCreated: true, adminCopyVerified: true }), selectedAdminId: async () => privateAdminId,
      cleanup: async () => {}, denied: async () => {}, verifyConfiguration: async () => {}, functionEnvironmentBinder: mockFunctionBinder,
      artifactInspector: async () => ({}), oauthConfiguration: async () => ({ canonicalCallbackVerified: true }), pause: async () => {},
      health: async (url, expected) => {
        if (url.includes('new-')) return;
        const component = url.includes('ai-sport-api.vercel.app') ? 'api' : 'web';
        events.push(['health', component, expected.revision]);
        // Use the real revision mismatch marker and validation path.
        const served = assignments[component].includes('old-') ? original[component].APP_REVISION.value : revision;
        return checkReleaseHealth(url, expected, { fetcher: async () => new Response(JSON.stringify(aliasHealthPayload(served, {
          service: component === 'api' ? 'alcide-api' : 'alcide-web', status: component === 'api' ? 'ready' : 'ok',
        })), { headers: { 'content-type': 'application/json' } }) });
      },
      command: (_command, args, child) => {
        const component = child.VERCEL_PROJECT_ID;
        if (args.includes('deploy')) return `https://new-${component}.vercel.app`;
        if (args.includes('promote')) {
          const url = args[args.indexOf('promote') + 1]; promotions.push(url);
          if (scenario === 'alias_command_fails' && url === 'https://old-api.vercel.app') throw new Error('private-rollback-command');
          assignments[component] = url;
          if (component === 'web' && url === 'https://new-web.vercel.app' && !webPromotionFailed) { webPromotionFailed = true; throw new Error('private-promote-timeout-may-have-mutated'); }
        }
        return '';
      },
    });
    assert.equal(result.complete, false); assert.equal(result.rollbackComplete, scenario === 'complete');
    assert.deepEqual(promotions, ['https://new-api.vercel.app', 'https://new-web.vercel.app', 'https://old-web.vercel.app', 'https://old-api.vercel.app']);
    assert.equal(result.previousAliasReferences[0].revision, oldRevision); assert.equal(result.previousAliasReferences[1].revision, 'c'.repeat(40));
    assert.equal(result.rollback.web.alias.verification.complete, true);
    assert.equal(result.rollback.web.alias.verification.revision, 'c'.repeat(40));
    if (scenario === 'alias_command_fails') {
      assert.equal(result.rollback.api.alias.commandSucceeded, false); assert.equal(result.rollback.api.alias.failure.reason, 'alias_convergence_timeout');
    } else { assert.equal(result.rollback.api.alias.verification.complete, true); assert.equal(result.rollback.api.alias.verification.revision, oldRevision); }
    if (scenario === 'environment_mismatch') { assert.equal(result.rollback.api.environment.complete, false); assert.equal(result.rollback.api.environment.failure.reason, 'rollback_environment_readback_mismatch'); }
    else { assert.equal(result.rollback.api.environment.complete, true); assert.deepEqual(current, original); }
    for (const value of [env.VERCEL_TOKEN, privateAdminId, 'private-rollback-command', 'private-promote-timeout', service, auth]) assert.equal(JSON.stringify(result).includes(value), false);
  }
});

test('restored environment must match original absence, value, type and shared target scope', async () => {
  const original = { APP_REVISION: { value: oldRevision, type: 'encrypted', target: ['production', 'preview'] }, AUTH_URL: null };
  const actual = structuredClone(original);
  const provider = { snapshot: async () => actual };
  assert.equal((await verifyRestoredConfiguration('web', original, Object.keys(original), provider)).complete, true);
  for (const change of [
    () => { actual.APP_REVISION.value = revision; }, () => { actual.APP_REVISION.type = 'plain'; },
    () => { actual.APP_REVISION.target = ['production']; }, () => { actual.AUTH_URL = { value: 'new' }; },
  ]) {
    Object.assign(actual, structuredClone(original)); change();
    await assert.rejects(verifyRestoredConfiguration('web', original, Object.keys(original), provider), /readback_mismatch/);
  }
});

test('a mixed final API/Web pair can never produce a successful release', async () => {
  const provider = providerFixture(); const promotions = []; let webPromoted = false; let rollbackStarted = false;
  provider.replace = async (_project, _original, _key, _value, undo) => undo.push(async () => {});
  const result = await deployClosedProduction(env, { ...configuration(), source }, provider, {
    bootstrap: async () => ({ ...ready, targetCreated: true, adminCopyVerified: true }), selectedAdminId: async () => privateAdminId,
    cleanup: async () => {}, denied: async () => {}, verifyConfiguration: async () => {}, functionEnvironmentBinder: mockFunctionBinder,
    artifactInspector: async () => ({}), oauthConfiguration: async () => ({ canonicalCallbackVerified: true }), pause: async () => {},
    command: (_command, args, child) => {
      if (args.includes('deploy')) return `https://new-${child.VERCEL_PROJECT_ID}.vercel.app`;
      if (args.includes('promote')) { const target = args[args.indexOf('promote') + 1]; promotions.push(target); if (target.includes('old-')) rollbackStarted = true; if (target === 'https://new-web.vercel.app') webPromoted = true; }
      return '';
    },
    health: async (url, expected) => {
      if (!url.includes('ai-sport-api.vercel.app') && !url.includes('www.alcideai.fr')) return;
      const api = url.includes('ai-sport-api.vercel.app');
      const served = rollbackStarted ? oldRevision : webPromoted && api ? 'c'.repeat(40) : revision;
      return checkReleaseHealth(url, expected, { fetcher: async () => new Response(JSON.stringify(aliasHealthPayload(served, { service: api ? 'alcide-api' : 'alcide-web', status: api ? 'ready' : 'ok' })), { headers: { 'content-type': 'application/json' } }) });
    },
  });
  assert.equal(result.complete, false); assert.equal(result.failure.failedStage, 'api_final_alias_health'); assert.equal(result.failure.reason, 'health_revision_mismatch');
  assert.equal(result.rollbackComplete, true); assert.deepEqual(promotions.slice(-2), ['https://old-web.vercel.app', 'https://old-api.vercel.app']);
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
    selectedAdminId: async () => privateAdminId, cleanup: async () => {}, health: async () => {}, denied: async () => {}, verifyConfiguration: async () => {}, functionEnvironmentBinder: mockFunctionBinder, oauthConfiguration: async () => ({ canonicalCallbackVerified: true }),
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
    verifyConfiguration: async () => {}, functionEnvironmentBinder: mockFunctionBinder, oauthConfiguration: async () => ({ canonicalCallbackVerified: true }), cleanup: async () => {},
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

test('fresh automation propagation retries only the exact provider SSO redirect and then validates real health JSON', async () => {
  for (const status of [302, 303, 307, 308]) {
    let elapsed = 0; const delays = []; const requests = [];
    const result = await checkReleaseHealth('https://web-propagation.vercel.app/api/health', { service: 'alcide-web', status: 'ok', revision }, {
      bypassSecret: 'private-ephemeral-bypass', pause: async (ms) => { delays.push(ms); elapsed += ms; },
      fetcher: async (url, options) => {
        requests.push(String(url));
        assert.equal(new URL(url).origin, 'https://web-propagation.vercel.app');
        assert.equal(String(url).includes('private-ephemeral'), false);
        assert.equal(options.redirect, 'manual'); assert.equal(options.headers['x-vercel-protection-bypass'], 'private-ephemeral-bypass');
        if (elapsed < 2000) return new Response(null, { status, headers: { location: 'https://vercel.com/sso-api?nonce=private-provider-detail' } });
        return new Response(JSON.stringify({ service: 'alcide-web', status: 'ok', revision, timestamp: new Date().toISOString() }), { headers: { 'content-type': 'application/json' } });
      },
    });
    assert.deepEqual(delays, [1000, 2000]); assert.equal(requests.length, 3);
    assert.equal(new Set(requests).size, 1); assert.equal(result.revision, revision);
    assert.equal(JSON.stringify(result).includes('private'), false);
  }
});

test('permanent provider SSO stops after the bounded backoff without following or disclosing the redirect', async () => {
  const delays = []; let requests = 0; let failure;
  try {
    await checkReleaseHealth('https://web-propagation.vercel.app/api/health', { service: 'alcide-web', status: 'ok', revision }, {
      bypassSecret: 'private-ephemeral-bypass', pause: async (ms) => delays.push(ms), fetcher: async (url, options) => {
        requests += 1; assert.equal(new URL(url).origin, 'https://web-propagation.vercel.app');
        assert.equal(options.headers['x-vercel-protection-bypass'], 'private-ephemeral-bypass');
        return new Response(null, { status: 302, headers: { location: 'https://vercel.com/sso-api?nonce=private-provider-detail' } });
      },
    });
    assert.fail('permanent SSO must not qualify a deployment');
  } catch (error) { failure = safeReleaseFailure(error, 'web_health'); }
  assert.deepEqual(delays, [1000, 2000, 4000, 8000]); assert.equal(requests, 5);
  assert.equal(failure.reason, 'health_cross_origin_redirect_refused');
  for (const value of ['private-ephemeral-bypass', 'private-provider-detail']) assert.equal(JSON.stringify(failure).includes(value), false);
});

test('automation propagation does not retry application errors, unrecognized redirects or unauthenticated requests', async () => {
  for (const [status, location, bypassSecret] of [
    [503, undefined, 'private-bypass'], [401, undefined, 'private-bypass'],
    [301, 'https://vercel.com/sso-api', 'private-bypass'], [302, 'https://other.example.test/sso-api', 'private-bypass'],
    [302, 'https://vercel.com/other-path', 'private-bypass'], [302, 'https://vercel.com/sso-api', undefined],
  ]) {
    let requests = 0;
    await assert.rejects(checkReleaseHealth('https://web-propagation.vercel.app/api/health', { service: 'alcide-web', status: 'ok', revision }, {
      bypassSecret, pause: async () => assert.fail('this response must not be retried'), fetcher: async (url) => {
        requests += 1; assert.equal(new URL(url).origin, 'https://web-propagation.vercel.app');
        return location ? new Response(null, { status, headers: { location } }) :
          new Response(JSON.stringify({ error: 'private-application-error' }), { status, headers: { 'content-type': 'application/json' } });
      },
    }));
    assert.equal(requests, 1);
  }
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
  assert.deepEqual(calls, ['/v13/deployments/candidate-fixture.vercel.app', '/v3/env/pull/dpl_fixture?source=vercel-cli%3Apull']);
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

test('deployment diagnostics use the application override even when the legacy variable names the source database', async () => {
  const preferred = new URL(source); preferred.pathname = `/${env.TARGET_DATABASE_NAME}`;
  for (const override of [preferred.toString(), '']) {
    const report = await inspectDeploymentDatabase({ ...env, DIAGNOSTIC_DEPLOYMENT_URL: 'https://candidate-fixture.vercel.app' }, {
      provider: {
        snapshot: async () => ({ DATABASE_URL: { value: source } }),
        request: async (path) => path.startsWith('/v13/') ? { id: 'dpl_fixture', projectId: 'api', url: 'candidate-fixture.vercel.app' } :
          { env: { DATABASE_URL: source, ALCIDE_DATABASE_URL: override }, buildEnv: {} },
      },
      databaseInspector: async (value) => {
        assert.notEqual(override, ''); assert.equal(new URL(value).pathname, `/${env.TARGET_DATABASE_NAME}`);
        return { databaseNameMatchesEnvironment: true, migrationTablePresent: true, migrationCount: 13 };
      },
    });
    if (override) { assert.equal(report.complete, true); assert.equal(report.applicationDatabaseOverrideSelected, true); assert.equal(report.runtimeDatabaseNameMatchesTarget, true); assert.equal(report.sql.migrationCount, 13); }
    else { assert.equal(report.complete, false); assert.equal(report.reason, 'deployment_runtime_database_unavailable'); }
  }
});

test('diagnostics accept an explicit deployment ID and expose the failing read stage without private errors', async () => {
  const calls = [];
  const provider = new VercelProduction(env);
  const underlyingRequest = provider.request.bind(provider);
  provider.fetcher = async () => ({ ok: false, status: 400, json: async () => ({ error: { code: 'bad_request', message: 'Invalid request: source is a required parameter. private-provider-details' } }) });
  provider.request = async (path) => {
    calls.push(path);
    return path.startsWith('/v13/') ? { id: 'dpl_fixture', projectId: 'api', url: 'candidate-fixture.vercel.app' } : underlyingRequest(path);
  };
  provider.snapshot = async () => assert.fail('failed deployment pull must not proceed to project variables');
  const report = await inspectDeploymentDatabase({ ...env, DIAGNOSTIC_DEPLOYMENT_ID: 'dpl_fixture' }, { provider });
  assert.deepEqual(calls, ['/v13/deployments/dpl_fixture', '/v3/env/pull/dpl_fixture?source=vercel-cli%3Apull', '/v3/env/pull/api/production?source=vercel-cli%3Apull']);
  assert.equal(report.complete, false); assert.equal(report.failure.failedStage, 'diagnostic_environment_pull');
  assert.equal(report.failure.httpStatus, 400); assert.equal(report.deploymentUrl, 'https://candidate-fixture.vercel.app');
  assert.equal(report.failure.providerValidation.code, 'bad_request');
  assert.equal(report.failure.providerValidation.signals.mentionsSource, true);
  assert.equal(report.failure.providerValidation.signals.requiredParameter, true);
  assert.equal(JSON.stringify(report).includes('private-provider'), false);
});

test('a successful project-production fallback never becomes evidence of an immutable deployment environment', async () => {
  const provider = new VercelProduction(env);
  provider.fetcher = async () => ({ ok: false, status: 400, json: async () => ({ error: { code: 'bad_request', message: 'Deployment not supported' } }) });
  const original = provider.request.bind(provider);
  provider.request = async (path) => path.startsWith('/v13/') ? { id: 'dpl_fixture', projectId: 'api', url: 'candidate-fixture.vercel.app' } :
    path.includes('/api/production?') ? { env: { DATABASE_URL: source, PRIVATE_VALUE: 'private-fallback-secret' } } : original(path);
  const report = await inspectDeploymentDatabase({ ...env, DIAGNOSTIC_DEPLOYMENT_ID: 'dpl_fixture' }, { provider,
    databaseInspector: async () => assert.fail('project fallback cannot substitute runtime SQL proof') });
  assert.equal(report.complete, false); assert.equal(report.failure.failedStage, 'diagnostic_environment_pull');
  assert.equal(report.projectEnvironmentPullDiagnostic.complete, true);
  assert.equal(report.projectEnvironmentPullDiagnostic.immutableDeploymentObserved, false);
  assert.equal(report.projectEnvironmentPullDiagnostic.databaseNameMatchesTarget, false);
  assert.equal(JSON.stringify(report).includes('private-fallback'), false);
});

test('build and deploy receive exact release values in child env and deploy arguments contain keys only', async () => {
  const provider = providerFixture(); const canonicalWrites = []; const writes = [];
  provider.replace = async (project, _original, key, value) => { writes.push([project, key, value]); if (['AUTH_URL', 'NEXTAUTH_URL'].includes(key)) canonicalWrites.push([project, key, value]); };
  const observed = [];
  const result = await deployClosedProduction({ ...env, AUTH_URL: 'https://legacy.example.test', NEXTAUTH_URL: 'https://legacy.example.test' }, { ...configuration(), source }, provider, {
    bootstrap: async () => ({ ...ready, targetCreated: true, adminCopyVerified: true }), selectedAdminId: async () => privateAdminId,
    verifyConfiguration: async () => {}, functionEnvironmentBinder: mockFunctionBinder, oauthConfiguration: async () => ({ canonicalCallbackVerified: true }), cleanup: async () => {}, health: async () => {}, denied: async () => {},
    command: (_command, args, child) => {
      if (args.includes('build') || args.includes('deploy')) {
        observed.push([child.VERCEL_PROJECT_ID, args.includes('deploy') ? 'deploy' : 'build']);
        assert.equal(child.PRODUCTION_ACCESS_MODE, 'admin-only'); assert.equal(child.ADMIN_EMAILS, env.BOOTSTRAP_ADMIN_EMAIL);
        assert.equal(child.APP_REVISION, revision);
        for (const privateValue of [env.BOOTSTRAP_ADMIN_EMAIL, privateAdminId, 'private_password']) assert.equal(args.some((arg) => arg.includes(privateValue)), false);
        if (child.VERCEL_PROJECT_ID === 'api') {
          assert.equal(new URL(child.DATABASE_URL).pathname, `/${env.TARGET_DATABASE_NAME}`);
          assert.equal(child.ALCIDE_DATABASE_URL, child.DATABASE_URL);
          assert.equal(child.BOOTSTRAP_ADMIN_USER_ID, privateAdminId);
          assert.equal(child.AI_MAX_COMPLETION_TOKENS, '11000');
          if (args.includes('deploy')) {
            for (const key of ['DATABASE_URL', 'ALCIDE_DATABASE_URL', 'AI_MAX_COMPLETION_TOKENS']) assert.ok(args.some((arg, index) => arg === '--env' && args[index + 1] === key));
          }
        } else {
          assert.equal(child.API_URL, 'https://ai-sport-api.vercel.app');
          assert.equal(child.AUTH_URL, 'https://www.alcideai.fr'); assert.equal(child.NEXTAUTH_URL, 'https://www.alcideai.fr');
          assert.equal(child.AI_MAX_COMPLETION_TOKENS, undefined);
          if (args.includes('deploy')) {
            for (const key of ['API_URL', 'AUTH_URL', 'NEXTAUTH_URL']) assert.ok(args.some((arg, index) => arg === '--env' && args[index + 1] === key));
          }
        }
      }
      return args.includes('deploy') ? `https://${child.VERCEL_PROJECT_ID}-deterministic.vercel.app` : '';
    },
  });
  assert.equal(result.complete, true);
  assert.deepEqual(writes.filter((write) => write[1] === 'AI_MAX_COMPLETION_TOKENS'), [['api', 'AI_MAX_COMPLETION_TOKENS', '11000']]);
  assert.equal(writes.some((write) => /BUDGET|DAILY|GLOBAL/.test(write[1])), false);
  assert.deepEqual(observed, [['api', 'build'], ['api', 'deploy'], ['web', 'build'], ['web', 'deploy']]);
  assert.deepEqual(canonicalWrites, [['web', 'AUTH_URL', 'https://www.alcideai.fr'], ['web', 'NEXTAUTH_URL', 'https://www.alcideai.fr']]);
});

test('API planner cap is snapshotted, read back exactly and compensated without changing budget limits', async () => {
  const original = { id: 'planner-cap', key: 'AI_MAX_COMPLETION_TOKENS', type: 'plain', target: ['production'], value: '2048' };
  const provider = new VercelProduction(env); const requests = [];
  provider.request = async (path, method, body) => { requests.push({ path, method, body }); return {}; };
  const undo = [];
  await provider.replace('api', original, 'AI_MAX_COMPLETION_TOKENS', '11000', undo);
  assert.equal(requests[0].body.value, '11000'); await undo[0](); assert.equal(requests[1].body.value, '2048');
  const fixture = liveProvider(); const config = liveConfiguration();
  fixture.snapshot = async (project, keys) => {
    assert.equal(keys.includes('AI_MAX_COMPLETION_TOKENS'), project === 'api');
    return config[project];
  };
  await inspectConfiguration(liveEnv(), fixture);
  for (const value of ['2048', '11000']) {
    const check = verifyReleaseConfiguration('api', { AI_MAX_COMPLETION_TOKENS: '11000' }, { snapshot: async () => ({ AI_MAX_COMPLETION_TOKENS: { value } }) });
    if (value === '11000') await check; else await assert.rejects(check, /readback_mismatch/);
  }
  await assert.rejects(provider.replace('api', null, 'AI_DAILY_TOKEN_LIMIT', '999999999', []), /allowlisted/);
  assert.ok(requests.every((request) => request.path === '/v9/projects/api/env/planner-cap'));
});

test('canonical authentication origins are checked exactly before the Web build', async () => {
  const expected = { AUTH_URL: 'https://www.alcideai.fr', NEXTAUTH_URL: 'https://www.alcideai.fr' };
  await assert.rejects(verifyReleaseConfiguration('web', expected, { snapshot: async () => ({ AUTH_URL: { value: 'https://ai-sport-web.vercel.app' }, NEXTAUTH_URL: { value: expected.NEXTAUTH_URL } }) }), /release_environment_readback_mismatch/);
  assert.equal((await verifyReleaseConfiguration('web', expected, { snapshot: async () => Object.fromEntries(Object.entries(expected).map(([key, value]) => [key, { value }])) })).matched, true);
});

test('cache cleanup is limited to the three verified paths inside an explicitly identified GHA checkout', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'alcide-release-clean-'));
  const checkout = join(directory, 'checkout');
  try {
    for (const path of ['.vercel', 'apps/api/.vercel', 'apps/web/.vercel']) {
      await mkdir(join(checkout, path), { recursive: true }); await writeFile(join(checkout, path, 'private.fixture'), 'private');
    }
    await writeFile(join(directory, 'preserve.fixture'), 'preserve');
    await assert.rejects(cleanupVercelCheckout({}, { cwd: checkout }), /requires_github_checkout/);
    await access(join(checkout, '.vercel', 'private.fixture'));
    await assert.rejects(cleanupVercelCheckout({ GITHUB_ACTIONS: 'true', GITHUB_WORKSPACE: directory }, { cwd: checkout }), /requires_github_checkout/);
    await cleanupVercelCheckout({ GITHUB_ACTIONS: 'true', GITHUB_WORKSPACE: checkout }, { cwd: checkout });
    for (const path of ['.vercel', 'apps/api/.vercel', 'apps/web/.vercel']) await assert.rejects(access(join(checkout, path)), { code: 'ENOENT' });
    assert.equal(await readFile(join(directory, 'preserve.fixture'), 'utf8'), 'preserve');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('local build diagnostics identify function overrides, bundled database literals and separate output roots without revealing values', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alcide-artifact-inspect-'));
  const expectedUrl = new URL(source); expectedUrl.pathname = '/alcide_admin_test'; expectedUrl.searchParams.set('sslmode', 'verify-full');
  const expected = { DATABASE_URL: expectedUrl.toString(), ALCIDE_DATABASE_URL: expectedUrl.toString(), PRODUCTION_ACCESS_MODE: 'admin-only', BOOTSTRAP_ADMIN_USER_ID: privateAdminId };
  const gha = { ...env, GITHUB_ACTIONS: 'true', GITHUB_WORKSPACE: root };
  try {
    const cache = join(root, '.vercel'); const func = join(cache, 'output/functions/api/index.func');
    await mkdir(func, { recursive: true });
    await writeFile(join(cache, 'project.json'), JSON.stringify({ projectId: 'api', settings: { rootDirectory: 'apps/api' } }));
    await writeFile(join(cache, '.env.production.local'), `DATABASE_URL="${source}"\nPRODUCTION_ACCESS_MODE="admin-only"\n`);
    await writeFile(join(cache, 'output/builds.json'), JSON.stringify({ target: 'production', cliVersion: '54.17.2' }));
    await writeFile(join(func, '.vc-config.json'), JSON.stringify({ environment: { DATABASE_URL: source, ALCIDE_DATABASE_URL: source, PRODUCTION_ACCESS_MODE: 'public', PRIVATE_KEY: 'private-extra-secret' } }));
    await writeFile(join(func, 'index.js'), `const database = process.env['ALCIDE_DATABASE_URL'] ?? process.env['DATABASE_URL']; const oldExample = '${source}'; const newExample = '${expected.DATABASE_URL}';`);
    await mkdir(join(root, 'apps/api/.vercel/output'), { recursive: true });
    const result = await inspectVercelBuildArtifacts(gha, { cwd: root, component: 'api', expectedValues: expected, sourceDatabaseUrl: source });
    assert.equal(result.complete, true); assert.equal(result.processEnvironmentObserved, false);
    assert.equal(result.onlyOneOutputDirectory, false); assert.equal(result.outputs.length, 2);
    const output = result.outputs[0];
    assert.equal(output.projectIdMatches, true); assert.equal(output.projectRootDirectoryMatches, true);
    assert.equal(output.productionBuildTarget, true); assert.equal(output.cliVersionMatches, true);
    assert.equal(output.pulledEnvironmentPresent, true); assert.deepEqual(output.pulledEnvironmentMismatchedKeys, ['DATABASE_URL']);
    assert.equal(output.functionConfigurations, 1); assert.equal(output.filesWithDatabaseEnvironmentReference, 1);
    assert.equal(output.filesWithApplicationDatabaseEnvironmentReference, 1);
    assert.deepEqual(output.conflictingOverrideKeys, ['ALCIDE_DATABASE_URL', 'DATABASE_URL', 'PRODUCTION_ACCESS_MODE']);
    assert.deepEqual(output.databaseLiterals, { expected: 1, source: 1, other: 0 });
    assert.equal(result.environmentOverridesConsistent, false);
    for (const value of ['private-extra-secret', 'private_user', 'private_password', privateAdminId]) assert.equal(JSON.stringify(result).includes(value), false);
    await writeFile(join(func, '.vc-config.json'), JSON.stringify({ environment: expected }));
    assert.equal((await inspectVercelBuildArtifacts(gha, { cwd: root, expectedValues: expected })).environmentOverridesConsistent, true);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('artifact capture refuses a local checkout and survives a failed staged health check in the release report', async () => {
  assert.equal((await inspectVercelBuildArtifacts(env)).reason, 'artifact_capture_requires_github_checkout');
  const provider = providerFixture(); provider.replace = async () => {};
  let captured = false;
  const result = await deployClosedProduction(env, { ...configuration(), source }, provider, {
    bootstrap: async () => ({ ...ready, targetCreated: true, adminCopyVerified: true }), selectedAdminId: async () => privateAdminId,
    verifyConfiguration: async () => {}, functionEnvironmentBinder: mockFunctionBinder, oauthConfiguration: async () => ({ canonicalCallbackVerified: true }), cleanup: async () => {},
    command: (_command, args) => args.includes('deploy') ? 'https://inspected-candidate.vercel.app' : '',
    artifactInspector: async (child, options) => {
      assert.equal(child.PRODUCTION_ACCESS_MODE, 'admin-only'); assert.equal(options.component, 'api');
      assert.equal(new URL(options.expectedValues.DATABASE_URL).pathname, '/alcide_admin_test');
      captured = true; return { complete: true, readOnly: true, environmentOverridesConsistent: true, outputs: [] };
    },
    health: async () => { assert.equal(captured, true); throw new Error('private-intentional-probe-stop'); },
  });
  assert.equal(result.complete, false); assert.equal(result.rollbackComplete, true);
  assert.equal(result.buildArtifactDiagnostics.api.complete, true);
  assert.deepEqual(result.stagedDeploymentUrls, ['https://inspected-candidate.vercel.app']);
  assert.equal(JSON.stringify(result).includes('private-intentional'), false);
});

test('function binding pins Node release values, preserves unrelated env, skips Edge and deduplicates confined aliases', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alcide-function-binding-'));
  const cache = join(root, '.vercel'); const functions = join(cache, 'output/functions');
  const node = join(functions, 'api.func'); const edge = join(functions, 'middleware.func');
  const gha = { ...env, GITHUB_ACTIONS: 'true', GITHUB_WORKSPACE: root };
  const expected = { DATABASE_URL: 'postgresql://fixture:private-new@db.example.test/alcide_admin_test', ALCIDE_DATABASE_URL: 'postgresql://fixture:private-new@db.example.test/alcide_admin_test', PRODUCTION_ACCESS_MODE: 'admin-only', BOOTSTRAP_ADMIN_USER_ID: privateAdminId, APP_REVISION: revision };
  try {
    await mkdir(node, { recursive: true }); await mkdir(edge, { recursive: true });
    await writeFile(join(cache, 'project.json'), JSON.stringify({ projectId: 'api', settings: { rootDirectory: 'apps/api' } }));
    await writeFile(join(cache, 'output/builds.json'), JSON.stringify({ target: 'production' }));
    const edgeConfig = { runtime: 'edge', entrypoint: 'index.js', envVarsInUse: ['PRODUCTION_ACCESS_MODE'] };
    await writeFile(join(edge, '.vc-config.json'), JSON.stringify(edgeConfig));
    await symlink(node, join(functions, 'alias.func'), process.platform === 'win32' ? 'junction' : 'dir');
    for (const originalEnvironment of [{}, { DATABASE_URL: source, CUSTOM_VALUE: 'preserve-private-existing', PRODUCTION_ACCESS_MODE: 'public' }]) {
      await writeFile(join(node, '.vc-config.json'), JSON.stringify({ runtime: 'nodejs24.x', handler: 'index.js', maxDuration: 60, environment: originalEnvironment }));
      const result = await bindVercelFunctionEnvironment(gha, { cwd: root, component: 'api', expectedValues: expected });
      assert.equal(result.complete, true); assert.equal(result.nodeBoundCount, 1); assert.equal(result.edgeSkippedCount, 1);
      assert.equal(result.internalAliasesSkippedCount, 1); assert.equal(result.readbackVerified, true);
      const copied = JSON.parse(await readFile(join(node, '.vc-config.json'), 'utf8'));
      assert.deepEqual(copied.environment, { ...originalEnvironment, ...expected }); assert.equal(copied.maxDuration, 60);
      assert.deepEqual(JSON.parse(await readFile(join(edge, '.vc-config.json'), 'utf8')), edgeConfig);
      assert.equal(JSON.stringify(result).includes('private-new'), false); assert.equal(JSON.stringify(result).includes(privateAdminId), false);
      const diagnostic = await inspectVercelBuildArtifacts(gha, { cwd: root, expectedValues: expected });
      assert.equal(diagnostic.environmentOverridesConsistent, true);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('Web publisher bindings and pulled build values are privately verified while API bindings reject notices', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alcide-web-publisher-binding-'));
  const cache = join(root, '.vercel'); const node = join(cache, 'output/functions/web.func');
  const gha = { ...env, GITHUB_ACTIONS: 'true', GITHUB_WORKSPACE: root }; const expected = publisherFixture();
  try {
    await mkdir(node, { recursive: true });
    await writeFile(join(cache, 'project.json'), JSON.stringify({ projectId: 'web', settings: { rootDirectory: 'apps/web' } }));
    await writeFile(join(cache, 'output/builds.json'), JSON.stringify({ target: 'production', cliVersion: '54.17.2' }));
    await writeFile(join(node, '.vc-config.json'), JSON.stringify({ runtime: 'nodejs24.x', environment: { EXISTING: 'preserved-fixture' } }));
    await writeFile(join(cache, '.env.production.local'), Object.entries(expected).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n'));
    const binding = await bindVercelFunctionEnvironment(gha, { cwd: root, component: 'web', expectedValues: expected });
    assert.equal(binding.readbackVerified, true); assert.equal(binding.nodeBoundCount, 1);
    const output = JSON.parse(await readFile(join(node, '.vc-config.json'), 'utf8'));
    assert.deepEqual(output.environment, { EXISTING: 'preserved-fixture', ...expected });
    const artifacts = await inspectVercelBuildArtifacts(gha, { cwd: root, component: 'web', expectedValues: expected });
    assert.equal(artifacts.complete, true); assert.equal(artifacts.environmentOverridesConsistent, true);
    assert.deepEqual(artifacts.outputs[0].pulledEnvironmentComparedKeys.sort(), Object.keys(expected).sort());
    assert.deepEqual(artifacts.outputs[0].pulledEnvironmentMismatchedKeys, []);
    for (const value of Object.values(expected)) assert.equal(JSON.stringify({ binding, artifacts }).includes(value), false);
    await assert.rejects(bindVercelFunctionEnvironment(gha, { cwd: root, component: 'api', expectedValues: { DATABASE_URL: source, ...expected } }), /function_binding_expected_values_required/);
    assert.equal((await inspectVercelBuildArtifacts(gha, { cwd: root, component: 'api', expectedValues: { DATABASE_URL: source, ...expected } })).reason, 'artifact_expected_configuration_required');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('function binding rejects wrong project, wrong root directory, multiple outputs and external aliases before modifying configs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alcide-function-reject-'));
  const outside = await mkdtemp(join(tmpdir(), 'alcide-function-outside-'));
  const cache = join(root, '.vercel'); const functions = join(cache, 'output/functions'); const node = join(functions, 'api.func');
  const gha = { ...env, GITHUB_ACTIONS: 'true', GITHUB_WORKSPACE: root };
  const expected = { DATABASE_URL: 'postgresql://fixture:private-new@db.example.test/alcide_admin_test' };
  try {
    await mkdir(node, { recursive: true });
    const original = JSON.stringify({ runtime: 'nodejs24.x', environment: { DATABASE_URL: source } });
    await writeFile(join(node, '.vc-config.json'), original);
    await writeFile(join(cache, 'output/builds.json'), JSON.stringify({ target: 'production' }));
    for (const project of [{ projectId: 'foreign', settings: { rootDirectory: 'apps/api' } }, { projectId: 'api', settings: { rootDirectory: 'apps/web' } }]) {
      await writeFile(join(cache, 'project.json'), JSON.stringify(project));
      await assert.rejects(bindVercelFunctionEnvironment(gha, { cwd: root, expectedValues: expected }), /project_mismatch/);
      assert.equal(await readFile(join(node, '.vc-config.json'), 'utf8'), original);
    }
    await writeFile(join(cache, 'project.json'), JSON.stringify({ projectId: 'api', settings: { rootDirectory: 'apps/api' } }));
    await mkdir(join(root, 'apps/api/.vercel/output'), { recursive: true });
    await assert.rejects(bindVercelFunctionEnvironment(gha, { cwd: root, expectedValues: expected }), /single_active_output/);
    await rm(join(root, 'apps/api/.vercel/output'), { recursive: true });
    await symlink(outside, join(functions, 'escape.func'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(bindVercelFunctionEnvironment(gha, { cwd: root, expectedValues: expected }), /path_outside_checkout/);
    assert.equal(await readFile(join(node, '.vc-config.json'), 'utf8'), original);
    await assert.rejects(bindVercelFunctionEnvironment(env, { cwd: root, expectedValues: expected }), /requires_github_checkout/);
  } finally { await rm(root, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true }); }
});

test('vendor validation reveals only a bounded machine code and static message categories', () => {
  const unsupported = safeVercelValidation({ error: { code: 'unsupported_deployment', message: 'Deployment is not supported: private-url private-value' } });
  assert.equal(unsupported.signals.mentionsDeployment, true); assert.equal(unsupported.signals.unsupported, true);
  assert.equal(JSON.stringify(unsupported).includes('private-'), false);
  const unsafe = safeVercelValidation({ error: { code: 'Private-Secret-123', message: 'Decryption forbidden for private-password' } });
  assert.equal(unsafe.code, undefined); assert.equal(unsafe.signals.decryptionForbidden, true);
  assert.equal(JSON.stringify(unsafe).includes('private-password'), false);
});

test('temporary project bypass compensates generation failures, revokes only its token and is idempotent', async () => {
  const provider = new VercelProduction({ ...env, GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '2' });
  const state = { 'third-party-token': { scope: 'automation-bypass' } }; const calls = []; const undo = [];
  provider.request = async (path, method = 'GET', body) => {
    calls.push({ path, method, body });
    if (body?.generate) {
      assert.equal(undo.length, 1); assert.equal(body.generate.note, 'Alcide closed release validation 123-2');
      assert.equal(/^[a-zA-Z0-9]{32}$/.test(body.generate.secret), true);
      state[body.generate.secret] = { scope: 'automation-bypass' };
    }
    if (body?.revoke) { assert.equal(Array.isArray(body.revoke), false); assert.equal(body.revoke.regenerate, false); delete state[body.revoke.secret]; }
    return { protectionBypass: { ...state } };
  };
  const lease = await provider.temporaryAutomationBypass('web', undo);
  assert.equal(/^[a-f0-9]{32}$/.test(lease.secret), true); assert.equal(Object.hasOwn(state, lease.secret), true);
  await lease.revoke(); await lease.revoke(); await undo[0]();
  assert.deepEqual(Object.keys(state), ['third-party-token']);
  assert.equal(calls.filter((call) => call.body?.revoke).length, 1);
  assert.ok(calls.every((call) => call.path === '/v9/projects/web' || call.path === '/v1/projects/web/protection-bypass'));
  const failedUndo = []; const failedCalls = [];
  provider.request = async (_path, _method, body) => {
    failedCalls.push(body);
    if (body?.generate) throw new Error('private-generate-failure');
    return { protectionBypass: { ...state } };
  };
  await assert.rejects(provider.temporaryAutomationBypass('web', failedUndo));
  await failedUndo[0](); assert.equal(failedCalls.some((body) => body?.revoke), false);
});

test('Web validation uses a temporary header then revokes before promotion, also compensating health and revoke failures', async () => {
  for (const scenario of ['success', 'health_failure', 'revoke_failure', 'existing_token']) {
    const input = { ...env, ...(scenario === 'existing_token' ? { VERCEL_AUTOMATION_BYPASS_SECRET: 'third-party-token' } : {}) };
    const provider = new VercelProduction(input); const state = { 'third-party-token': { scope: 'automation-bypass' } };
    const requests = []; let ownToken; let promoted = 0;
    provider.previousDeployment = async (project) => previousReference(project);
    provider.verifyAliasDeployment = async () => ({ assignmentVerified: true });
    provider.snapshot = async (project) => configuration()[project];
    provider.replace = async (_project, _original, _key, _value, undo) => { undo.push(async () => {}); };
    provider.request = async (_path, method = 'GET', body) => {
      requests.push({ method, body });
      if (body?.generate) { ownToken = body.generate.secret; state[ownToken] = { scope: 'automation-bypass' }; }
      if (body?.revoke) {
        assert.equal(body.revoke.secret, ownToken);
        if (scenario === 'revoke_failure') throw new Error('private-revoke-failure');
        delete state[ownToken];
      }
      return { protectionBypass: { ...state } };
    };
    const result = await deployClosedProduction(input, { ...configuration(), source }, provider, {
      bootstrap: async () => ({ ...ready, targetCreated: true, adminCopyVerified: true }), selectedAdminId: async () => privateAdminId,
      verifyConfiguration: async () => {}, functionEnvironmentBinder: mockFunctionBinder, artifactInspector: async () => ({ complete: true }), cleanup: async () => {}, denied: async () => {},
      health: async (_url, expected, options = {}) => {
        if (expected.service === 'alcide-api') assert.equal(options.bypassSecret, undefined);
        if (expected.service === 'alcide-web' && _url.includes('web-validation.vercel.app')) {
          assert.equal(options.bypassSecret, ownToken ?? 'third-party-token');
          if (scenario === 'health_failure') throw new Error('private-health-failure');
        }
      },
      oauthConfiguration: async (_url, options) => { assert.equal(options.bypassSecret, ownToken ?? 'third-party-token'); return { canonicalCallbackVerified: true }; },
      command: (_command, args, child) => {
        if (ownToken) assert.equal(args.some((argument) => argument.includes(ownToken)), false);
        if (args.includes('promote')) { promoted += 1; assert.equal(Boolean(ownToken && Object.hasOwn(state, ownToken)), false); }
        return args.includes('deploy') ? `https://${child.VERCEL_PROJECT_ID}-validation.vercel.app` : '';
      },
    });
    if (scenario === 'success' || scenario === 'existing_token') { assert.equal(result.complete, true); assert.equal(promoted, 2); }
    else { assert.equal(result.complete, false); assert.equal(promoted, 0); }
    if (scenario === 'health_failure') { assert.equal(result.rollbackComplete, true); assert.equal(result.failure.failedStage, 'web_health'); }
    if (scenario === 'revoke_failure') { assert.equal(result.rollbackComplete, false); assert.equal(result.failure.failedStage, 'web_automation_bypass_revoke'); }
    else if (ownToken) assert.equal(Object.hasOwn(state, ownToken), false);
    assert.equal(Object.hasOwn(state, 'third-party-token'), true);
    if (scenario === 'existing_token') assert.equal(requests.length, 0);
    for (const privateValue of [ownToken, 'third-party-token', 'private-health-failure', 'private-revoke-failure'].filter(Boolean)) assert.equal(JSON.stringify(result).includes(privateValue), false);
  }
});

test('Web OAuth configuration requires the exact canonical callback and refuses cross-origin redirects', async () => {
  let calls = 0;
  const response = (callbackUrl) => new Response(JSON.stringify({ google: { id: 'google', callbackUrl } }), { headers: { 'content-type': 'application/json' } });
  const result = await checkWebOAuthConfiguration('https://web-validation.vercel.app', { bypassSecret: 'private-bypass', fetcher: async (url, options) => {
    calls += 1; assert.equal(url.origin, 'https://web-validation.vercel.app'); assert.equal(url.search, '');
    assert.equal(options.headers['x-vercel-protection-bypass'], 'private-bypass'); assert.equal(options.redirect, 'manual');
    return response('https://www.alcideai.fr/api/auth/callback/google');
  } });
  assert.equal(result.canonicalCallbackVerified, true); assert.equal(calls, 1);
  await assert.rejects(checkWebOAuthConfiguration('https://web-validation.vercel.app', { fetcher: async () => response('https://ai-sport-web.vercel.app/api/auth/callback/google') }), /canonical_callback_mismatch/);
  await assert.rejects(checkWebOAuthConfiguration('https://web-validation.vercel.app', { bypassSecret: 'private-bypass', pause: async () => {}, fetcher: async () => new Response(null, { status: 302, headers: { location: 'https://vercel.com/sso-api' } }) }), /sso_redirect_refused/);
});

test('OAuth provider discovery waits for the same bounded automation propagation as health then validates the canonical callback', async () => {
  for (const status of [302, 303, 307, 308]) {
    const delays = []; const requests = []; let elapsed = 0;
    const result = await checkWebOAuthConfiguration('https://web-validation.vercel.app', {
      bypassSecret: 'private-ephemeral-bypass', pause: async (ms) => { delays.push(ms); elapsed += ms; },
      fetcher: async (url, options) => {
        requests.push(String(url));
        assert.equal(url.origin, 'https://web-validation.vercel.app'); assert.equal(url.pathname, '/api/auth/providers'); assert.equal(url.search, '');
        assert.equal(options.redirect, 'manual'); assert.equal(options.headers['x-vercel-protection-bypass'], 'private-ephemeral-bypass');
        if (elapsed < 2000) return new Response(null, { status, headers: { location: 'https://vercel.com/sso-api?nonce=private-provider-detail' } });
        return new Response(JSON.stringify({ google: { id: 'google', callbackUrl: 'https://www.alcideai.fr/api/auth/callback/google' } }), { headers: { 'content-type': 'application/json' } });
      },
    });
    assert.deepEqual(delays, [1000, 2000]); assert.equal(requests.length, 3); assert.equal(new Set(requests).size, 1);
    assert.deepEqual(result, { googleProviderConfigured: true, canonicalCallbackVerified: true }); assert.equal(JSON.stringify(result).includes('private'), false);
  }
});

test('permanent OAuth provider SSO fails with a static safe reason after the shared backoff and never follows the redirect', async () => {
  const delays = []; let requests = 0; let failure;
  try {
    await checkWebOAuthConfiguration('https://web-validation.vercel.app', {
      bypassSecret: 'private-ephemeral-bypass', pause: async (ms) => delays.push(ms),
      fetcher: async (url, options) => {
        requests += 1; assert.equal(url.origin, 'https://web-validation.vercel.app'); assert.equal(url.pathname, '/api/auth/providers');
        assert.equal(options.redirect, 'manual'); assert.equal(options.headers['x-vercel-protection-bypass'], 'private-ephemeral-bypass');
        return new Response(null, { status: 302, headers: { location: 'https://vercel.com/sso-api?private=private-provider-detail' } });
      },
    });
    assert.fail('permanent SSO must not qualify OAuth configuration');
  } catch (error) { failure = safeReleaseFailure(error, 'web_oauth_configuration'); }
  assert.deepEqual(delays, [1000, 2000, 4000, 8000]); assert.equal(requests, 5);
  assert.equal(failure.reason, 'web_oauth_configuration_sso_redirect_refused'); assert.equal(failure.failedStage, 'web_oauth_configuration');
  for (const value of ['private-ephemeral-bypass', 'private-provider-detail']) assert.equal(JSON.stringify(failure).includes(value), false);
});

test('OAuth discovery never retries application failures, other redirects, absent bypass or an invalid canonical callback', async () => {
  for (const [status, location, bypassSecret, callbackUrl] of [
    [500, undefined, 'private-bypass'], [503, undefined, 'private-bypass'], [401, undefined, 'private-bypass'],
    [302, 'https://other.example.test/sso-api', 'private-bypass'], [302, 'https://vercel.com/other-path', 'private-bypass'],
    [302, 'https://vercel.com.evil.test/sso-api', 'private-bypass'], [302, 'https://private:password@vercel.com/sso-api', 'private-bypass'],
    [301, 'https://vercel.com/sso-api', 'private-bypass'], [302, 'https://vercel.com/sso-api', undefined],
    [200, undefined, 'private-bypass', 'https://foreign.example.test/api/auth/callback/google'],
  ]) {
    let requests = 0; let failure;
    try {
      await checkWebOAuthConfiguration('https://web-validation.vercel.app', { bypassSecret,
        pause: async () => assert.fail('application response or unrelated redirect must not be retried'),
        fetcher: async (url, options) => {
          requests += 1; assert.equal(url.origin, 'https://web-validation.vercel.app'); assert.equal(options.redirect, 'manual');
          assert.equal(options.headers['x-vercel-protection-bypass'], bypassSecret);
          if (location) return new Response(null, { status, headers: { location } });
          return new Response(JSON.stringify(callbackUrl ? { google: { id: 'google', callbackUrl } } : { error: 'private-application-detail' }), { status, headers: { 'content-type': 'application/json' } });
        },
      });
      assert.fail('unqualified OAuth configuration must fail');
    } catch (error) { failure = safeReleaseFailure(error, 'web_oauth_configuration'); }
    assert.equal(requests, 1);
    assert.equal(failure.reason, location ? (location === 'https://vercel.com/sso-api' && status !== 301 ? 'web_oauth_configuration_sso_redirect_refused' : 'web_oauth_configuration_redirect_refused') : callbackUrl ? 'web_oauth_canonical_callback_mismatch' : 'web_oauth_configuration_http_error');
    if (!location && !callbackUrl) assert.equal(failure.httpStatus, status);
    for (const value of ['private-bypass', 'private-application-detail', 'password']) assert.equal(JSON.stringify(failure).includes(value), false);
  }
});

test('secret length validation exposes only fixed length constraint signals', () => {
  const result = safeVercelValidation({ error: { code: 'bad_request', message: 'Secret must not be longer than 32 characters: private-token-value' } });
  assert.equal(result.signals.mentionsSecret, true); assert.equal(result.signals.secretLengthConstraint, true);
  assert.equal(result.signals.mentions32, true); assert.equal(result.signals.mentionsMaxLength, true);
  assert.equal(JSON.stringify(result).includes('private-token'), false);
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
  assert.match(workflow, /options: \[plan, rehearse, deploy, update\]/);
  assert.match(workflow, /UPDATE_CONFIRM: \$\{\{ inputs.update_confirm \}\}/);
  assert.match(workflow, /publisher_confirm:\s*\n\s*description:[^\n]*\n\s*type: string\s*\n\s*default: ''/);
  assert.match(workflow, /PUBLISHER_CONFIRM: \$\{\{ inputs.publisher_confirm \}\}/);
  assert.match(workflow, /LEGAL_PUBLISHER_JSON: \$\{\{ secrets.PRODUCTION_LEGAL_PUBLISHER_JSON \}\}/);
  assert.match(workflow, /if: inputs.mode == 'deploy' \|\| inputs.mode == 'update'/);
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
