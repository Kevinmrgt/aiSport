import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyClosedPilotRelease } from './verify-closed-pilot-release.mjs';

const revision = 'a'.repeat(40);
function fixture({ phase = 'before', plan = 'hobby', present = false, count = 0, mode = 'admin-only', stripe = '', current = revision } = {}) {
  let queries = 0, ended = false;
  const value = (v) => ({ value: v });
  const client = { connect: async () => {}, end: async () => { ended = true; }, query: async (sql) => {
    queries++;
    if (sql.startsWith('select to_regclass')) return { rows: [{ control: present, invitations: present, admissions: present, attempts: present }] };
    if (sql.startsWith('select (select count')) return { rows: [{ control: count, invitations: 0, admissions: 0, attempts: 0 }] };
    assert.ok(['begin read only', 'rollback'].includes(sql));
    return { rows: [] };
  } };
  const env = { PILOT_CHECK_PHASE: phase, RELEASE_REVISION: revision, VERCEL_ORG_ID: 'team_fixture', VERCEL_API_PROJECT_ID: 'api' };
  const settings = { PRODUCTION_ACCESS_MODE: value(mode), ADMIN_EMAILS: value('synthetic-owner@example.test'), APP_REVISION: value(current) };
  return { env, options: { provider: { request: async () => ({ id: 'team_fixture', billing: { plan } }), snapshot: async () => ({ STRIPE_TEST_SIMULATION_ENABLED: value(stripe) }) }, inspect: async () => ({ ready: true, api: settings, web: settings, source: 'synthetic-not-a-real-url' }), clientFactory: () => client }, queries: () => queries, ended: () => ended };
}

test('before deployment accepts absent pilot tables only under verified free hosting and admin-only settings', async () => {
  const f = fixture();
  const result = await verifyClosedPilotRelease(f.env, f.options);
  assert.equal(result.complete, true);
  assert.equal(result.pilotInactive, true);
  assert.equal(f.ended(), true);
});
test('after deployment requires empty pilot schema and the exact revision', async () => {
  const f = fixture({ phase: 'after', present: true });
  assert.equal((await verifyClosedPilotRelease(f.env, f.options)).complete, true);
  for (const input of [{ phase: 'after' }, { phase: 'after', present: true, count: 1 }, { phase: 'after', present: true, current: 'b'.repeat(40) }]) {
    const invalid = fixture(input);
    assert.equal((await verifyClosedPilotRelease(invalid.env, invalid.options)).complete, false);
  }
});
test('refuses paid or unverified plans before touching the database', async () => {
  for (const plan of ['pro', 'enterprise', undefined]) {
    const f = fixture({ plan: plan ?? 'unverified' });
    assert.equal((await verifyClosedPilotRelease(f.env, f.options)).reason, 'free_hosting_plan_not_verified');
    assert.equal(f.queries(), 0);
  }
});
test('refuses public access, billing simulation and any optional paid recipe or publisher change', async () => {
  for (const input of [{ mode: 'public' }, { stripe: 'true' }]) {
    const f = fixture(input);
    assert.equal((await verifyClosedPilotRelease(f.env, f.options)).complete, false);
    assert.equal(f.queries(), 0);
  }
  const f = fixture();
  assert.equal((await verifyClosedPilotRelease({ ...f.env, ADMIN_RECIPE_CONFIRM: 'one-workout-one-program-existing-admin' }, f.options)).reason, 'optional_release_mutations_not_allowed');
});
test('does not disclose raw provider or database errors', async () => {
  for (const sentinel of ['postgres://private-value', 'private_provider_token']) {
    const f = fixture();
    f.options.provider.request = async () => { throw new Error(sentinel); };
    const result = await verifyClosedPilotRelease(f.env, f.options);
    assert.equal(result.complete, false);
    assert.equal(result.reason, 'closed_release_private_diagnostics_required');
    assert.equal(JSON.stringify(result).includes(sentinel), false);
  }
  const f = fixture({ plan: 'private_billing_value' });
  assert.equal(JSON.stringify(await verifyClosedPilotRelease(f.env, f.options)).includes('private_billing_value'), false);
});

test('does not copy unvalidated phase or revision into evidence', async () => {
  const f = fixture();
  const result = await verifyClosedPilotRelease({ ...f.env, PILOT_CHECK_PHASE: 'private-phase-sentinel', RELEASE_REVISION: 'private-token-sentinel' }, f.options);
  assert.equal(result.complete, false);
  assert.equal(JSON.stringify(result).includes('sentinel'), false);
  assert.equal(f.queries(), 0);
});
