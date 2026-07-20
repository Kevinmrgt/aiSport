import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { getIgnoreDecision } from './vercel-ignore-policy.mjs';

const cliPath = fileURLToPath(new URL('./vercel-ignore-build.mjs', import.meta.url));

test('ignores automatic production deployments from the Git integration', () => {
  const decision = getIgnoreDecision({
    app: 'web',
    vercelEnv: 'production',
    forceBuild: undefined,
    files: ['apps/web/app/page.tsx'],
  });

  assert.equal(decision.ignore, true);
  assert.match(decision.reason, /GitHub Actions CD is canonical/);
});

test('allows the canonical CD to force a production build', () => {
  const decision = getIgnoreDecision({
    app: 'api',
    vercelEnv: 'production',
    forceBuild: '1',
    files: [],
  });

  assert.equal(decision.ignore, false);
});

test('keeps relevant preview deployments', () => {
  const apiDecision = getIgnoreDecision({
    app: 'api',
    vercelEnv: 'preview',
    forceBuild: undefined,
    files: ['apps/api/src/index.ts'],
  });
  const sharedDecision = getIgnoreDecision({
    app: 'web',
    vercelEnv: 'preview',
    forceBuild: undefined,
    files: ['pnpm-lock.yaml'],
  });

  assert.equal(apiDecision.ignore, false);
  assert.equal(sharedDecision.ignore, false);
});

test('ignores documentation-only preview deployments', () => {
  const decision = getIgnoreDecision({
    app: 'web',
    vercelEnv: 'preview',
    forceBuild: undefined,
    files: ['docs/deployment.md'],
  });

  assert.equal(decision.ignore, true);
});

test('continues when the changed files cannot be determined', () => {
  const decision = getIgnoreDecision({
    app: 'api',
    vercelEnv: 'preview',
    forceBuild: undefined,
    files: [],
  });

  assert.equal(decision.ignore, false);
});

test('rejects an unknown application', () => {
  assert.throws(
    () =>
      getIgnoreDecision({
        app: 'worker',
        vercelEnv: 'preview',
        forceBuild: undefined,
        files: [],
      }),
    /Unknown app/,
  );
});

test('the real CLI ignores an automatic production build', () => {
  const result = spawnSync(process.execPath, [cliPath, 'web'], {
    encoding: 'utf8',
    env: { ...process.env, VERCEL_ENV: 'production', VERCEL_FORCE_BUILD: '' },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /GitHub Actions CD is canonical/);
});

test('the real CLI allows a forced production build', () => {
  const result = spawnSync(process.execPath, [cliPath, 'api'], {
    encoding: 'utf8',
    env: { ...process.env, VERCEL_ENV: 'production', VERCEL_FORCE_BUILD: '1' },
  });

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /Forced build: continue/);
});
