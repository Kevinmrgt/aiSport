import assert from 'node:assert/strict';
import test from 'node:test';
import { readReleaseTargets, validateReleaseEvidence } from './cd-release-preflight.mjs';

function fixture() {
  const revision = 'a'.repeat(40); const migrationFingerprint = 'b'.repeat(64);
  const sourceIdentity = 'c'.repeat(64); const date = new Date().toISOString();
  return {
    revision, migrationFingerprint,
    targets: { sourceIdentity, migrationIdentity: sourceIdentity },
    legal: { operatorName: 'Synthetic Test Operator', contactEmail: 'privacy@alcide.test', hostingName: 'Synthetic Host', hostingContact: 'https://host.test/contact', processingBasis: 'Synthetic reviewed test basis', transfersNotice: 'Synthetic reviewed test safeguards' },
    restore: { result: 'passed', rowCountsMatch: true, candidateMigrationsApplied: true, encrypted: true, tablesVerified: 9, performedAt: date, sourceIdentity, restoreIdentity: 'd'.repeat(64), dumpSha256: 'e'.repeat(64), migrationFingerprint },
    checklist: { revision, canonicalWebOrigin: 'https://www.alcideai.fr', oauthCallbackOrigin: 'https://www.alcideai.fr', databaseIdentity: sourceIdentity, performedAt: date, reviewer: 'Synthetic Test Reviewer', checks: Object.fromEntries(['targetMapping','legacyDataReview','oauthFreshLogin','twoUserIsolation','aiWorkoutProgram','alertsReceived','providerContracts','sportsReview','dataPolicyReviewed'].map((key) => [key, true])) },
  };
}

test('release requires real review fields, matching schema proof and exact candidate', () => {
  assert.deepEqual(validateReleaseEvidence(fixture()), []);
  const changed = fixture(); changed.checklist.revision = 'f'.repeat(40);
  assert.match(validateReleaseEvidence(changed).join('\n'), /checklist/);
  changed.restore.migrationFingerprint = '0'.repeat(64);
  assert.match(validateReleaseEvidence(changed).join('\n'), /restauration/);
});

test('missing legal identity, stale proof and unperformed checks fail closed', () => {
  const changed = fixture(); changed.legal.operatorName = 'TODO';
  changed.restore.performedAt = '2000-01-01'; changed.checklist.checks.sportsReview = false;
  const problems = validateReleaseEvidence(changed).join('\n');
  assert.match(problems, /operatorName/); assert.match(problems, /restauration/); assert.match(problems, /sportsReview/);
});

test('a dump without a restore and candidate migration rehearsal is never sufficient', () => {
  const changed = fixture(); changed.restore.candidateMigrationsApplied = false;
  assert.match(validateReleaseEvidence(changed).join('\n'), /restauration/);
  changed.restore.candidateMigrationsApplied = true; changed.restore.restoreIdentity = changed.restore.sourceIdentity;
  assert.match(validateReleaseEvidence(changed).join('\n'), /restauration/);
});

test('changing the actual application or migration target invalidates old evidence', () => {
  const changed = fixture(); changed.targets.sourceIdentity = 'f'.repeat(64);
  assert.match(validateReleaseEvidence(changed).join('\n'), /base applicative reelle/);
  const wrongMigration = fixture(); wrongMigration.targets.migrationIdentity = 'f'.repeat(64);
  assert.match(validateReleaseEvidence(wrongMigration).join('\n'), /connexion de migration/);
  const missing = fixture(); delete missing.targets;
  assert.match(validateReleaseEvidence(missing).join('\n'), /base applicative reelle/);
});

test('both configured connections are inspected and a missing direct URL uses the application URL', async () => {
  const seen = [];
  const reader = (value) => {
    seen.push(value);
    return Promise.resolve({ sourceIdentity: value === 'direct-target' ? 'd'.repeat(64) : 'a'.repeat(64) });
  };
  const result = await readReleaseTargets({ DATABASE_URL: 'application-target', MIGRATION_DATABASE_URL: 'direct-target' }, reader);
  assert.deepEqual(seen, ['application-target', 'direct-target']);
  assert.notEqual(result.sourceIdentity, result.migrationIdentity);
  seen.length = 0;
  const fallback = await readReleaseTargets({ DATABASE_URL: 'application-target' }, reader);
  assert.deepEqual(seen, ['application-target', 'application-target']);
  assert.equal(fallback.sourceIdentity, fallback.migrationIdentity);
});
