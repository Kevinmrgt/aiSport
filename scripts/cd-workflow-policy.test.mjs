import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  shouldRunProductionCd,
  validateProductionCdWorkflow,
} from './cd-workflow-policy.mjs';

const workflowUrl = new URL('../.github/workflows/deploy-vercel.yml', import.meta.url);

test('la politique courante lie les trois jobs au succès de la CI sur main', async () => {
  const source = await readFile(workflowUrl, 'utf8');
  assert.deepEqual(validateProductionCdWorkflow(source), []);
});

test('une CI en échec bloque intégralement le CD', () => {
  assert.equal(shouldRunProductionCd({ conclusion: 'failure', enabled: true }), false);
});

test('une CI annulée ou ignorée bloque intégralement le CD', () => {
  assert.equal(shouldRunProductionCd({ conclusion: 'cancelled', enabled: true }), false);
  assert.equal(shouldRunProductionCd({ conclusion: 'skipped', enabled: true }), false);
});

test('le CD ne démarre que pour une CI réussie et une gate activée', () => {
  assert.equal(shouldRunProductionCd({ conclusion: 'success', enabled: false }), false);
  assert.equal(shouldRunProductionCd({ conclusion: 'success', enabled: true }), true);
});

test('le validateur détecte un contournement manuel', async () => {
  const source = await readFile(workflowUrl, 'utf8');
  const altered = source.replace('  workflow_run:', '  workflow_dispatch:\n  workflow_run:');
  assert.match(validateProductionCdWorkflow(altered).join('\n'), /workflow_dispatch/);
});

test('le validateur détecte la suppression de la condition de succès', async () => {
  const source = await readFile(workflowUrl, 'utf8');
  const altered = source.replaceAll(
    "github.event.workflow_run.conclusion == 'success' && ",
    '',
  );
  assert.match(validateProductionCdWorkflow(altered).join('\n'), /gate success/);
});
