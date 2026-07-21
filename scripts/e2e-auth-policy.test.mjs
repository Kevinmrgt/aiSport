import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  filterStateForOrigin,
  hasAuthSessionCookie,
} from '../apps/web/scripts/e2e-auth-state.mjs';

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

test('la capture contrôle l’identité et exclut les cookies Google avant écriture', () => {
  const source = readFileSync(
    `${repositoryRoot}/apps/web/scripts/e2e-auth-capture-cdp.mjs`,
    'utf8',
  );

  const identityCheck = source.indexOf('authenticatedEmail !== expectedEmail');
  const domainFilter = source.indexOf('filterStateForOrigin(state, baseURL)');
  const stateWrite = source.indexOf('writeFileSync(storagePath');

  assert.ok(identityCheck >= 0, 'contrôle E2E_AUTH_EMAIL absent');
  assert.ok(domainFilter > identityCheck, 'filtrage des cookies Alcide absent');
  assert.ok(stateWrite > identityCheck, 'écriture avant le contrôle d’identité');
  assert.ok(stateWrite > domainFilter, 'écriture avant le filtrage des cookies');
});

test('le filtrage conserve Alcide et rejette Google ainsi que les sous-domaines trompeurs', () => {
  const alcideCookie = {
    name: '__Secure-authjs.session-token',
    value: 'session-de-test',
    domain: '.ai-sport-web.vercel.app',
  };
  const state = {
    cookies: [
      alcideCookie,
      { name: 'SID', value: 'google', domain: '.google.com' },
      { name: 'fake', value: 'fake', domain: 'evil.ai-sport-web.vercel.app' },
    ],
    origins: [
      { origin: 'https://ai-sport-web.vercel.app', localStorage: [] },
      { origin: 'https://accounts.google.com', localStorage: [] },
    ],
  };

  const filtered = filterStateForOrigin(state, 'https://ai-sport-web.vercel.app/generate');

  assert.deepEqual(filtered.cookies, [alcideCookie]);
  assert.deepEqual(filtered.origins, [state.origins[0]]);
  assert.equal(hasAuthSessionCookie(filtered), true);
});
