import assert from 'node:assert/strict';
import test from 'node:test';
import { checkProductionDatabaseTarget } from './production-database-target-check.mjs';

const sourceUrl = 'postgresql://private-role:private-password@source.private.invalid/private-database?sslmode=require';
const configuredUrl = 'postgresql://private-role:other-password@configured.private.invalid/private-database?sslmode=require';
const env = { VERCEL_TOKEN: 'private-token', VERCEL_ORG_ID: 'team', VERCEL_API_PROJECT_ID: 'api', DATABASE_URL: sourceUrl };
const record = { id: 'database-config', key: 'DATABASE_URL', target: ['production'], type: 'encrypted' };
function fetcher(records = [record], value = configuredUrl) {
  return async (url, options) => {
    assert.equal(options.redirect, 'error');
    assert.equal(url.origin, 'https://api.vercel.com');
    return { ok: true, json: async () => url.pathname.startsWith('/v10/') ? { envs: records } : { decrypted: true, value } };
  };
}

function mocks(overrides = {}) {
  const calls = [];
  const client = {
    connect: async () => { calls.push('connect'); },
    query: async (query) => { calls.push(query); return { rows: [] }; },
    end: async () => { calls.push('end'); },
  };
  return {
    calls,
    dependencies: {
      fetcher: fetcher(),
      identityReader: async (url) => { assert.equal(url, sourceUrl); return { sourceIdentity: 'private-identity', databaseMajor: 17 }; },
      clientFactory: (configuration) => {
        assert.equal(new URL(configuration.connectionString).hostname, 'configured.private.invalid');
        return client;
      },
      identityInspector: async (connection) => {
        assert.equal(connection, client); calls.push('identity');
        return { sourceIdentity: 'private-identity', databaseMajor: 17 };
      },
      lineageInspector: async (connection) => {
        assert.equal(connection, client); calls.push('lineage');
        return { compatible: false, appliedMigrations: 12, matchedPrefix: 7, reason: 'history_divergent', hash: 'private-registry-hash' };
      },
      ...overrides,
    },
  };
}

function assertSafe(result) {
  assert.doesNotMatch(JSON.stringify(result), /postgresql|private-|other-password|DATABASE_URL|connectionString|Bearer/);
}

test('compares SQL identities and inspects the configured lineage in one read-only transaction', async () => {
  const { calls, dependencies } = mocks();
  const result = await checkProductionDatabaseTarget(env, dependencies);
  assert.equal(result.complete, true); assert.equal(result.sameDatabase, true);
  assert.deepEqual(result.configuredMigrationLineage, {
    compatible: false, appliedMigrations: 12, matchedPrefix: 7, reason: 'history_divergent',
  });
  assert.deepEqual(calls, ['connect', 'begin isolation level repeatable read read only', 'identity', 'lineage', 'rollback', 'end']);
  assert.equal(result.rawConnectionConfigurationMatches, false);
  assert.equal(result.endpointHostMatches, false);
  assert.equal(result.databaseNameMatches, true);
  assert.equal(result.roleMatches, true);
  assertSafe(result);
});

test('identical configuration never overrides differing SQL identities', async () => {
  const { dependencies } = mocks({
    fetcher: fetcher([record], sourceUrl),
    clientFactory: () => ({ connect: async () => {}, query: async () => {}, end: async () => {} }),
    identityInspector: async () => ({ sourceIdentity: 'private-other-identity', databaseMajor: 17 }),
    lineageInspector: async () => ({ compatible: true, appliedMigrations: 7, matchedPrefix: 7, pendingMigrations: 6 }),
  });
  const result = await checkProductionDatabaseTarget(env, dependencies);
  assert.equal(result.complete, true); assert.equal(result.sameDatabase, false);
  for (const key of ['rawConnectionConfigurationMatches', 'endpointHostMatches', 'databaseNameMatches', 'roleMatches']) assert.equal(result[key], true);
  assert.deepEqual(result.configuredMigrationLineage, { compatible: true, appliedMigrations: 7, matchedPrefix: 7, pendingMigrations: 6 });
  assertSafe(result);
});

test('database and role mismatches are separate safe booleans', async () => {
  const { dependencies } = mocks({ fetcher: fetcher([record], 'postgresql://different-role:private-password@source.private.invalid/different-database') });
  dependencies.clientFactory = () => ({ connect: async () => {}, query: async () => {}, end: async () => {} });
  dependencies.identityInspector = async () => ({ sourceIdentity: 'private-other-identity', databaseMajor: 17 });
  dependencies.lineageInspector = async () => ({ compatible: false, appliedMigrations: 0, matchedPrefix: 0, reason: 'history_missing' });
  const result = await checkProductionDatabaseTarget(env, dependencies);
  assert.equal(result.complete, true); assert.equal(result.sameDatabase, false);
  assert.equal(result.rawConnectionConfigurationMatches, false); assert.equal(result.endpointHostMatches, true);
  assert.equal(result.databaseNameMatches, false); assert.equal(result.roleMatches, false);
  assertSafe(result);
});

test('missing, ambiguous and write-only variables cannot certify the database', async () => {
  for (const records of [[], [record, record], [{ ...record, visibility: 'secret' }], [{ ...record, type: 'sensitive' }]]) {
    const { calls, dependencies } = mocks({ fetcher: fetcher(records), identityReader: async () => { throw Error('reader must not be called'); } });
    const result = await checkProductionDatabaseTarget(env, dependencies);
    assert.equal(result.complete, false); assert.equal(result.sameDatabase, undefined);
    assert.deepEqual(calls, []); assertSafe(result);
  }
});

test('access, configuration, driver and inspection failures never certify or expose private data', async () => {
  const denied = await checkProductionDatabaseTarget(env, { fetcher: async () => ({ ok: false, status: 403 }) });
  assert.equal(denied.reason, 'http_403'); assertSafe(denied);
  for (const overrides of [
    { fetcher: fetcher([record], 'private-invalid-url') },
    { identityReader: async () => { throw Error('private-password'); } },
    { clientFactory: () => { throw Error(configuredUrl); } },
    { identityInspector: async () => { throw Error('private-driver-error'); } },
    { lineageInspector: async () => { throw Error('private-registry-error'); } },
    { lineageInspector: async () => ({ compatible: false, appliedMigrations: 12, matchedPrefix: 7, reason: 'private-error-reason' }) },
    { lineageInspector: async () => ({ compatible: true, appliedMigrations: 'private-registry', matchedPrefix: 7 }) },
  ]) {
    const { dependencies } = mocks(overrides);
    const result = await checkProductionDatabaseTarget(env, dependencies);
    assert.equal(result.complete, false); assert.equal(result.sameDatabase, undefined);
    assert.equal(result.reason, 'private_diagnostics_required');
    assertSafe(result);
  }
});

test('configured connection is closed when its inspection fails', async () => {
  const { calls, dependencies } = mocks({ lineageInspector: async () => { throw Error('private-error'); } });
  const result = await checkProductionDatabaseTarget(env, dependencies);
  assert.equal(result.complete, false); assert.equal(calls.at(-1), 'end');
  assertSafe(result);
});
