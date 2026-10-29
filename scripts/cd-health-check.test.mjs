import assert from 'node:assert/strict';
import test from 'node:test';
import { checkHealth, validateHealthPayload } from './cd-health-check.mjs';

const revision = 'a'.repeat(40);
const expected = { service: 'alcide-api', status: 'ready', revision };
const payload = () => ({ ...expected, timestamp: new Date().toISOString(), checks: { database: 'ok', schema: 'ok', aiConfiguration: 'ok' } });

test('health gate accepts the candidate and rejects old or unidentified builds', () => {
  assert.equal(validateHealthPayload(payload(), expected).revision, revision);
  assert.throws(() => validateHealthPayload({ ...payload(), revision: 'b'.repeat(40) }, expected), /differs/);
  assert.throws(() => validateHealthPayload({ ...payload(), revision: null }, expected), /immutable/);
});

test('HTTP 200 cannot hide HTML, wrong service, stale JSON or incomplete readiness', async () => {
  await assert.rejects(checkHealth('https://www.alcideai.fr/api/health', expected, {
    fetchImpl: async () => new Response('<html>login</html>', { headers: { 'content-type': 'text/html' } }),
  }), /not JSON/);
  assert.throws(() => validateHealthPayload({ ...payload(), service: 'other' }, expected), /Unexpected/);
  assert.throws(() => validateHealthPayload({ ...payload(), timestamp: '2000-01-01' }, expected), /Stale/);
  assert.throws(() => validateHealthPayload({ ...payload(), checks: { database: 'ok' } }, expected), /readiness/);
});

test('HTTP failure is rejected and bypass credentials are never sent to a custom host', async () => {
  await assert.rejects(checkHealth('https://www.alcideai.fr/api/health', expected, {
    bypassSecret: 'synthetic-bypass',
    fetchImpl: async (_url, options) => {
      assert.equal(options.headers['x-vercel-protection-bypass'], undefined);
      return new Response('{}', { status: 503 });
    },
  }), /HTTP 503/);
});

test('a redirect never forwards Vercel bypass credentials to the canonical host', async () => {
  let requests = 0;
  await checkHealth('https://candidate.vercel.app/health/ready', expected, {
    bypassSecret: 'synthetic-bypass',
    fetchImpl: async (url, options) => {
      requests += 1;
      if (url.hostname.endsWith('.vercel.app')) {
        assert.equal(options.headers['x-vercel-protection-bypass'], 'synthetic-bypass');
        return new Response(null, { status: 308, headers: { location: 'https://www.alcideai.fr/health/ready' } });
      }
      assert.equal(options.headers['x-vercel-protection-bypass'], undefined);
      return Response.json(payload());
    },
  });
  assert.equal(requests, 2);
});
