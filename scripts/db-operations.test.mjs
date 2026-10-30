import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { assertRestoreTarget, assertRestoredCounts, assertBackupCandidateFingerprint, encryptBackup, decryptBackup, pgEnvironment } from './db-operations.mjs';

test('a restore cannot certify different migrations by copying an old manifest fingerprint', () => {
  const fingerprint = 'a'.repeat(64);
  assert.equal(assertBackupCandidateFingerprint({ migrationFingerprint: fingerprint }, fingerprint), fingerprint);
  assert.throws(() => assertBackupCandidateFingerprint({ migrationFingerprint: fingerprint }, 'b'.repeat(64)), /differ/);
  assert.throws(() => assertBackupCandidateFingerprint({}, fingerprint), /differ/);
  assert.throws(() => assertBackupCandidateFingerprint({ migrationFingerprint: '' }, ''), /differ/);
});

test('restore refuses source, nonempty database, wrong version and missing confirmation', () => {
  const source = { sourceIdentity: 'source', databaseMajor: 16, tables: [] };
  const target = { sourceIdentity: 'target', databaseMajor: 16, tables: [] };
  const base = { confirmation: 'isolated-empty-database', target, manifest: source };
  assert.doesNotThrow(() => assertRestoreTarget(base));
  assert.throws(() => assertRestoreTarget({ ...base, target: source }), /source/);
  assert.throws(() => assertRestoreTarget({ ...base, target: { ...target, tables: [{}] } }), /no user tables/);
  assert.throws(() => assertRestoreTarget({ ...base, target: { ...target, databaseMajor: 17 } }), /major/);
  assert.throws(() => assertRestoreTarget({ ...base, confirmation: '' }), /confirmation/);
});

test('counts must match; credentials are environment-only and TLS verification explicit', () => {
  assert.throws(() => assertRestoredCounts({ tables: [{ rows: '2' }] }, { tables: [{ rows: '1' }] }), /differ/);
  const env = pgEnvironment('postgresql://audit:synth%21@localhost/audit?sslmode=require', true);
  assert.equal(env.PGSSLMODE, 'verify-full'); assert.equal(env.PGPASSWORD, 'synth!');
  assert.equal(env.PGSSLROOTCERT, 'system');
  assert.match(env.PGOPTIONS, /read_only=on/);
});

test('authenticated encryption round-trip succeeds and corruption is rejected', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'alcide-backup-test-'));
  try {
    const source = join(directory, 'source'); const encrypted = join(directory, 'encrypted');
    const restored = join(directory, 'restored'); const invalid = join(directory, 'invalid');
    await writeFile(source, 'synthetic backup fixture');
    const key = Buffer.alloc(32, 7).toString('base64');
    await encryptBackup(source, encrypted, key); await decryptBackup(encrypted, restored, key);
    assert.equal(await readFile(restored, 'utf8'), 'synthetic backup fixture');
    await assert.rejects(decryptBackup(encrypted, restored, key), /EEXIST/);
    assert.equal(await readFile(restored, 'utf8'), 'synthetic backup fixture');
    const bytes = await readFile(encrypted); bytes[24] ^= 1; await writeFile(invalid, bytes);
    await assert.rejects(decryptBackup(invalid, join(directory, 'rejected'), key));
  } finally {
    if (dirname(resolve(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith('alcide-backup-test-')) {
      throw new Error('Unexpected temporary test directory');
    }
    await rm(directory, { recursive: true, force: true });
  }
});
