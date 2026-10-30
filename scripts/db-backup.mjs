import { open, stat, unlink, writeFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { Client, databaseUrl, inventory, fileHash, migrationFingerprint, runPg, encryptBackup, dirname, OperationError, safeOperationFailure } from './db-operations.mjs';

const url = process.env['DATABASE_URL'];
const output = process.env['BACKUP_FILE'];
let created = false;
let client;
try {
  if (!output || !isAbsolute(output)) throw new OperationError('BACKUP_FILE must be an absolute new file path');
  const reservation = await open(output, 'wx', 0o600); await reservation.close(); created = true;
  client = new Client({ connectionString: databaseUrl(url).toString(), connectionTimeoutMillis: 15_000, statement_timeout: 30_000 });
  await client.connect();
  await client.query('begin isolation level repeatable read read only');
  const snapshot = (await client.query('select pg_export_snapshot() as snapshot')).rows[0].snapshot;
  const source = await inventory(client);
  runPg('pg_dump', ['--no-password', '--format=custom', '--no-owner', '--no-acl', `--snapshot=${snapshot}`, '--file', output], url, { readOnly: true, directory: dirname(output) });
  await client.query('commit');
  const manifest = {
    formatVersion: 1, createdAt: new Date().toISOString(), ...source,
    candidateRevision: /^[a-f0-9]{40}$/i.test(process.env['RELEASE_REVISION'] ?? '') ? process.env['RELEASE_REVISION'].toLowerCase() : null,
    migrationFingerprint: await migrationFingerprint(), dumpSha256: await fileHash(output), bytes: (await stat(output)).size,
    encrypted: Boolean(process.env['BACKUP_ENCRYPTION_KEY']),
  };
  if (manifest.encrypted) {
    await encryptBackup(output, `${output}.enc`, process.env['BACKUP_ENCRYPTION_KEY']);
    manifest.encryptedSha256 = await fileHash(`${output}.enc`);
    await unlink(output); created = false;
  }
  await writeFile(`${output}.manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ result: 'backup_created', encrypted: manifest.encrypted, tables: source.tables.length, bytes: manifest.bytes }));
} catch (error) {
  if (created) await unlink(output).catch(() => undefined);
  console.error(safeOperationFailure(error)); process.exitCode = 1;
} finally { if (client) await client.end().catch(() => undefined); }
