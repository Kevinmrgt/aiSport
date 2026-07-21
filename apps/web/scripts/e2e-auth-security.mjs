import { execFileSync } from 'node:child_process';
import { chmodSync } from 'node:fs';
import { isAbsolute, relative } from 'node:path';

export function assertPathInside(root, target) {
  const relativeTarget = relative(root, target);
  if (!relativeTarget || relativeTarget.startsWith('..') || isAbsolute(relativeTarget)) {
    throw new Error(`[E2E auth] Chemin temporaire refusé : ${target}`);
  }
}

export function restrictPathToCurrentUser(target, { directory = false } = {}) {
  if (process.platform !== 'win32') {
    chmodSync(target, directory ? 0o700 : 0o600);
    return;
  }

  const identity = execFileSync('whoami', { encoding: 'utf8' }).trim();
  if (!identity) throw new Error('[E2E auth] Identité Windows introuvable pour protéger la session.');

  const permission = directory ? '(OI)(CI)F' : 'F';
  execFileSync(
    'icacls',
    [target, '/inheritance:r', '/grant:r', `${identity}:${permission}`, '/Q'],
    { stdio: 'ignore' },
  );
}
