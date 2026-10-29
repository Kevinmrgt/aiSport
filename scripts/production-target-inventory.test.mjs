import assert from 'node:assert/strict';
import test from 'node:test';
import { inventoryTargets, safeProject } from './production-target-inventory.mjs';

test('target inventory excludes secrets and personal account fields', () => {
  const report = safeProject({ id: 'project', token: 'SECRET', user: { email: 'PRIVATE' }, env: [{ value: 'SECRET' }] },
    { domains: [{ name: 'www.alcideai.fr', token: 'SECRET' }] },
    { envs: [{ key: 'AUTH_SECRET', type: 'encrypted', value: 'SECRET', decryptedValue: 'SECRET' }] });
  assert.equal(report.environment[0].key, 'AUTH_SECRET');
  assert.doesNotMatch(JSON.stringify(report), /"SECRET"|PRIVATE|decryptedValue|"value"/);
});

test('access errors never print response bodies or exception contents', async () => {
  const report = await inventoryTargets({ VERCEL_TOKEN: 'token', VERCEL_ORG_ID: 'team', VERCEL_WEB_PROJECT_ID: 'web', VERCEL_API_PROJECT_ID: 'api' },
    async (_url, options) => {
      assert.equal(options.redirect, 'error');
      return { ok: false, status: 403, json: () => { throw new Error('SECRET'); } };
    });
  assert.equal(report.complete, false);
  assert.equal(report.results[0].reason, 'http_403');
  assert.doesNotMatch(JSON.stringify(report), /SECRET|token/);
});
