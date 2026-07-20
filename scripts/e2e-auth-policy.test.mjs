import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const repositoryRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();
const defaultState = 'apps/web/playwright/.auth/google-e2e.json';

test('le storageState authentifié est ignoré et non suivi par Git', () => {
  execFileSync('git', ['check-ignore', '-q', '--', defaultState], {
    cwd: repositoryRoot,
    stdio: 'ignore',
  });

  assert.throws(() =>
    execFileSync('git', ['ls-files', '--error-unmatch', '--', defaultState], {
      cwd: repositoryRoot,
      stdio: 'ignore',
    }),
  );
});

test('la capture contrôle l’identité avant d’écrire la session', () => {
  const source = readFileSync(`${repositoryRoot}/apps/web/tests/e2e/auth.capture.spec.ts`, 'utf8');

  const identityCheck = source.indexOf(').toBe(expectedEmail)');
  const stateWrite = source.indexOf('context.storageState');

  assert.ok(identityCheck >= 0, 'contrôle E2E_AUTH_EMAIL absent');
  assert.ok(stateWrite > identityCheck, 'la session serait écrite avant le contrôle d’identité');
});
