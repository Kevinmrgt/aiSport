import { readFile, unlink, writeFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Client, databaseUrl, inventory, fileHash, runPg, decryptBackup, assertRestoreTarget, assertRestoredCounts, migrationFingerprint, assertBackupCandidateFingerprint, dirname, OperationError, safeOperationFailure } from './db-operations.mjs';

const backup = process.env['BACKUP_FILE'];
const targetUrl = process.env['RESTORE_DATABASE_URL'];
const proof = process.env['RESTORE_EVIDENCE_FILE'];
let plaintext;
let client;
const started = Date.now();
try {
  if (!backup || !isAbsolute(backup) || !proof || !isAbsolute(proof)) throw new OperationError('Absolute BACKUP_FILE and RESTORE_EVIDENCE_FILE required');
  const manifest = JSON.parse(await readFile(`${backup}.manifest.json`, 'utf8'));
  if (manifest.formatVersion !== 1 || !/^[a-f0-9]{64}$/.test(manifest.dumpSha256 ?? '')) throw new OperationError('Invalid backup manifest');
  client = new Client({ connectionString: databaseUrl(targetUrl).toString(), connectionTimeoutMillis: 15_000, statement_timeout: 30_000 });
  await client.connect();
  const before = await inventory(client);
  assertRestoreTarget({ confirmation: process.env['RESTORE_CONFIRM'], target: before, manifest });
  let dump = backup;
  if (manifest.encrypted) {
    if (await fileHash(`${backup}.enc`) !== manifest.encryptedSha256) throw new OperationError('Encrypted backup checksum mismatch');
    const candidate = `${backup}.restore-${process.pid}.dump`;
    await decryptBackup(`${backup}.enc`, candidate, process.env['BACKUP_ENCRYPTION_KEY']);
    plaintext = candidate;
    dump = plaintext;
  }
  if (await fileHash(dump) !== manifest.dumpSha256) throw new OperationError('Backup checksum mismatch');
  runPg('pg_restore', ['--no-password', '--no-owner', '--no-acl', '--exit-on-error', '--single-transaction', '--dbname', decodeURIComponent(databaseUrl(targetUrl).pathname.slice(1)), dump], targetUrl, { directory: dirname(backup) });
  const restored = await inventory(client);
  assertRestoredCounts(manifest, restored);
  let candidateMigrationsApplied = false;
  let verifiedFingerprint = null;
  if (process.env['RESTORE_APPLY_CANDIDATE_MIGRATIONS'] === '1') {
    verifiedFingerprint = assertBackupCandidateFingerprint(manifest, await migrationFingerprint());
    const migration = spawnSync(process.execPath, [fileURLToPath(new URL('./db-migrate-locked.mjs', import.meta.url))], {
      env: { ...process.env, DATABASE_URL: targetUrl, MIGRATION_DATABASE_URL: targetUrl },
      stdio: ['ignore', 'pipe', 'pipe'], timeout: 180_000,
    });
    if (migration.error || migration.status !== 0) throw new OperationError('Candidate migration rehearsal failed on the isolated restore');
    const after = await inventory(client);
    for (const name of ['users', 'workouts', 'training_programs', 'session_logs']) {
      const sourceTable = manifest.tables.find((table) => table.schema === 'public' && table.name === name);
      const targetTable = after.tables.find((table) => table.schema === 'public' && table.name === name);
      if (sourceTable && sourceTable.rows !== targetTable?.rows) throw new OperationError('Candidate migration changed a protected table row count');
    }
    candidateMigrationsApplied = true;
  }
  const evidence = {
    formatVersion: 1, result: 'passed', performedAt: new Date().toISOString(), elapsedMs: Date.now() - started,
    sourceIdentity: manifest.sourceIdentity, restoreIdentity: restored.sourceIdentity,
    candidateRevision: manifest.candidateRevision, migrationFingerprint: verifiedFingerprint,
    dumpSha256: manifest.dumpSha256, encrypted: manifest.encrypted,
    tablesVerified: restored.tables.length, rowCountsMatch: true,
    candidateMigrationsApplied,
  };
  await writeFile(proof, `${JSON.stringify(evidence, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify(evidence));
} catch (error) {
  console.error(safeOperationFailure(error)); process.exitCode = 1;
} finally {
  if (client) await client.end().catch(() => undefined);
  if (plaintext) await unlink(plaintext).catch(() => undefined);
}
