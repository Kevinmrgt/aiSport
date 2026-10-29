import assert from 'node:assert/strict';
import test from 'node:test';
import { checkProductionDatabaseTarget } from './production-database-target-check.mjs';

const env = { VERCEL_TOKEN: 'private-token', VERCEL_ORG_ID: 'team', VERCEL_API_PROJECT_ID: 'api', DATABASE_URL: 'private-source-url' };
const record = { id: 'database-config', key: 'DATABASE_URL', target: ['production'], type: 'encrypted' };
function fetcher(records = [record]) {
  return async (url, options) => {
    assert.equal(options.redirect, 'error');
    assert.equal(url.origin, 'https://api.vercel.com');
    return { ok: true, json: async () => url.pathname.startsWith('/v10/') ? { envs: records } : { decrypted: true, value: 'private-vercel-url' } };
  };
}
test('compares the actual read-only database identities without returning decrypted configuration', async () => {
  const seen = [];
  const result = await checkProductionDatabaseTarget(env, { fetcher: fetcher(), identityReader: async (url) => {
    seen.push(url); return { sourceIdentity: 'same', databaseMajor: 17 };
  } });
  assert.equal(result.complete, true); assert.equal(result.sameDatabase, true);
  assert.deepEqual(seen, ['private-source-url', 'private-vercel-url']);
  assert.doesNotMatch(JSON.stringify(result), /private-|DATABASE_URL/);
  const different = await checkProductionDatabaseTarget(env, { fetcher: fetcher(), identityReader: async (url) => ({ sourceIdentity: url, databaseMajor: 17 }) });
  assert.equal(different.complete, true); assert.equal(different.sameDatabase, false);
});
test('missing, ambiguous and write-only variables cannot certify the database', async () => {
  const reader = async () => { throw Error('reader must not be called'); };
  for (const records of [[], [record, record], [{ ...record, visibility: 'secret' }], [{ ...record, type: 'sensitive' }]]) {
    const result = await checkProductionDatabaseTarget(env, { fetcher: fetcher(records), identityReader: reader });
    assert.equal(result.complete, false); assert.equal(result.sameDatabase, undefined);
  }
});
test('access and connection errors expose only fixed diagnostic categories', async () => {
  const denied = await checkProductionDatabaseTarget(env, { fetcher: async () => ({ ok: false, status: 403 }) });
  assert.equal(denied.reason, 'http_403');
  const privateError = await checkProductionDatabaseTarget(env, { fetcher: fetcher(), identityReader: async () => { throw Error('private-password'); } });
  assert.equal(privateError.reason, 'private_diagnostics_required');
  assert.doesNotMatch(JSON.stringify(privateError), /private-password/);
});
