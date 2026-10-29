import { pathToFileURL } from 'node:url';

export function validateHealthPayload(payload, { service, status, revision, now = Date.now() }) {
  if (!payload || typeof payload !== 'object') throw new Error('Health JSON object required');
  if (payload.service !== service || payload.status !== status) {
    throw new Error('Unexpected health service or status');
  }
  if (!/^[a-f0-9]{40}$/i.test(payload.revision ?? '')) throw new Error('Missing immutable revision');
  if (revision && payload.revision.toLowerCase() !== revision.toLowerCase()) {
    throw new Error('Served revision differs from candidate');
  }
  const timestamp = Date.parse(payload.timestamp);
  if (!Number.isFinite(timestamp) || timestamp > now + 60_000 || timestamp < now - 600_000) {
    throw new Error('Stale or invalid health timestamp');
  }
  if (status === 'ready' && (
    payload.checks?.database !== 'ok' || payload.checks?.schema !== 'ok' ||
    payload.checks?.aiConfiguration !== 'ok'
  )) throw new Error('Required readiness check failed');
  return { service: payload.service, status: payload.status, revision: payload.revision.toLowerCase() };
}

export async function checkHealth(url, expected, { fetchImpl = fetch, bypassSecret } = {}) {
  let parsed = new URL(url);
  parsed.searchParams.set('release_check', String(Date.now()));
  let response;
  const signal = AbortSignal.timeout(20_000);
  for (let hop = 0; hop < 6; hop += 1) {
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    if (parsed.username || parsed.password || (!local && parsed.protocol !== 'https:')) {
      throw new Error('Health URL must be HTTPS without credentials');
    }
    const headers = { 'cache-control': 'no-cache', 'user-agent': 'alcide-release-check/1.0' };
    if (bypassSecret && parsed.hostname.endsWith('.vercel.app')) {
      headers['x-vercel-protection-bypass'] = bypassSecret;
    }
    response = await fetchImpl(parsed, { headers, signal, redirect: 'manual' });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get('location');
    if (!location) throw new Error('Health redirect without destination');
    parsed = new URL(location, parsed);
    if (hop === 5) throw new Error('Too many health redirects');
  }
  if (!response.ok) throw new Error(`Health HTTP ${response.status}`);
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Health response is not JSON');
  }
  return validateHealthPayload(await response.json(), expected);
}

async function main() {
  const [url, service, status, revision] = process.argv.slice(2);
  if (!url || !['alcide-api', 'alcide-web'].includes(service) || !['ok', 'ready'].includes(status)) {
    throw new Error('Usage: cd-health-check.mjs URL alcide-api|alcide-web ok|ready [40-char revision]');
  }
  if (revision && !/^[a-f0-9]{40}$/i.test(revision)) throw new Error('Expected revision must be 40 hexadecimal characters');
  const result = await checkHealth(url, { service, status, revision }, {
    bypassSecret: process.env['VERCEL_AUTOMATION_BYPASS_SECRET'],
  });
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), ...result }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
