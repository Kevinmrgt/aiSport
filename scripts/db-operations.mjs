import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { open, readFile, readdir, stat, unlink } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { finished, pipeline } from 'node:stream/promises';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
export const { Client } = require('pg');
export const migrationsFolder = new URL('../apps/api/drizzle/', import.meta.url);

export class OperationError extends Error {}

export function safeOperationFailure(error) {
  if (error instanceof OperationError) return error.message;
  const code = typeof error?.code === 'string' && /^[a-z0-9_]{1,32}$/i.test(error.code)
    ? error.code : 'private-diagnostics-required';
  return `Database operation failed (${code})`;
}

export function databaseUrl(value) {
  if (!value) throw new OperationError('Explicit PostgreSQL URL required');
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.pathname.slice(1)) {
    throw new OperationError('Invalid PostgreSQL URL');
  }
  if (['prefer', 'require', 'verify-ca'].includes(url.searchParams.get('sslmode'))) {
    url.searchParams.set('sslmode', 'verify-full');
  }
  return url;
}

export function pgEnvironment(value, readOnly = false) {
  const url = databaseUrl(value);
  return {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGSSLMODE: url.searchParams.get('sslmode') ?? 'prefer',
    PGCHANNELBINDING: url.searchParams.get('channel_binding') ?? 'prefer',
    PGSSLROOTCERT: url.searchParams.get('sslrootcert') ??
      (url.searchParams.get('sslmode') === 'verify-full' ? 'system' : ''),
    PGCONNECT_TIMEOUT: '15',
    PGOPTIONS: readOnly ? '-c default_transaction_read_only=on' : '',
  };
}

export function quoteIdentifier(value) { return `"${value.replaceAll('"', '""')}"`; }

export async function fileHash(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

export async function migrationFingerprint() {
  const hash = createHash('sha256');
  const names = (await readdir(migrationsFolder)).filter((name) => name.endsWith('.sql')).sort();
  for (const name of names) {
    hash.update(name); hash.update('\0'); hash.update(await readFile(new URL(name, migrationsFolder))); hash.update('\0');
  }
  hash.update(await readFile(new URL('meta/_journal.json', migrationsFolder)));
  return hash.digest('hex');
}

export function assertBackupCandidateFingerprint(manifest, actualFingerprint) {
  if (!/^[a-f0-9]{64}$/.test(actualFingerprint ?? '') ||
      manifest.migrationFingerprint !== actualFingerprint) {
    throw new OperationError('Backup candidate migrations differ from the checkout being rehearsed');
  }
  return actualFingerprint;
}

export async function databaseIdentity(client) {
  const identity = (await client.query(`select current_database() as database,
    coalesce(inet_server_addr()::text, 'unix') as address,
    coalesce(inet_server_port(), 0) as port,
    current_setting('server_version_num')::int as version`)).rows[0];
  const sourceIdentity = createHash('sha256').update(JSON.stringify({
    database: identity.database, address: identity.address, port: identity.port,
  })).digest('hex');
  return { sourceIdentity, databaseMajor: Math.floor(identity.version / 10_000) };
}

/** Establish the actual target through SQL, never from a claimed URL or old checklist. */
export async function readDatabaseIdentity(value) {
  let client;
  try {
    client = new Client({
      connectionString: databaseUrl(value).toString(),
      connectionTimeoutMillis: 5_000,
      statement_timeout: 3_000,
      query_timeout: 4_000,
    });
    await client.connect();
    await client.query('begin read only');
    const result = await databaseIdentity(client);
    await client.query('rollback');
    return result;
  } catch {
    // Driver exceptions can embed credentials or a connection URL.
    throw new OperationError('Cannot establish the live PostgreSQL target identity');
  } finally {
    if (client) await client.end().catch(() => undefined);
  }
}

export async function inventory(client) {
  const identity = await databaseIdentity(client);
  const tables = (await client.query(`select n.nspname as schema, c.relname as name
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where c.relkind in ('r','p') and n.nspname not in ('pg_catalog','information_schema')
      and n.nspname not like 'pg_toast%' order by n.nspname,c.relname`)).rows;
  for (const table of tables) {
    table.rows = (await client.query(`select count(*)::text as count from ${quoteIdentifier(table.schema)}.${quoteIdentifier(table.name)}`)).rows[0].count;
  }
  return { ...identity, tables };
}

export function runPg(tool, args, url, { readOnly = false, directory } = {}) {
  const env = pgEnvironment(url, readOnly);
  const dockerImage = process.env['PG_TOOLS_DOCKER_IMAGE'];
  let command = process.env[tool === 'pg_dump' ? 'PG_DUMP_BIN' : 'PG_RESTORE_BIN'] ?? tool;
  let commandArgs = args;
  if (dockerImage) {
    if (process.platform === 'win32' || !/^postgres:(16|17|18)-alpine$/.test(dockerImage)) {
      throw new OperationError('Docker PostgreSQL tools require Linux and an approved PostgreSQL image');
    }
    const mounted = resolve(directory);
    command = 'docker';
    commandArgs = ['run', '--rm', '--network', 'host', ...[
      'PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGSSLMODE', 'PGSSLROOTCERT', 'PGCHANNELBINDING', 'PGCONNECT_TIMEOUT', 'PGOPTIONS',
    ].flatMap((key) => ['--env', key]), '--volume', `${mounted}:${mounted}`, dockerImage, tool, ...args];
  }
  const result = spawnSync(command, commandArgs, { env, stdio: ['ignore', 'ignore', 'pipe'], timeout: 600_000 });
  if (result.error || result.status !== 0) {
    // libpq and dump error text can contain connection or row data. Keep it out of logs/artifacts.
    throw new OperationError(`${tool} failed (${result.error?.code ?? result.status}); check tool version, permissions and connectivity privately`);
  }
}

function encryptionKey(value) {
  const key = Buffer.from(value ?? '', 'base64');
  if (key.length !== 32) throw new OperationError('BACKUP_ENCRYPTION_KEY must encode exactly 32 bytes');
  return key;
}

export async function encryptBackup(input, output, value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(value), iv);
  const reservation = await open(output, 'wx', 0o600); await reservation.close();
  try {
    const destination = createWriteStream(output, { flags: 'w', mode: 0o600 });
    destination.write(Buffer.concat([Buffer.from('ALCDB01\0'), iv]));
    await pipeline(createReadStream(input), cipher, destination, { end: false });
    destination.end(cipher.getAuthTag());
    await finished(destination);
  } catch (error) { await unlink(output).catch(() => undefined); throw error; }
}

export async function decryptBackup(input, output, value) {
  const size = (await stat(input)).size;
  if (size < 36) throw new OperationError('Invalid encrypted backup');
  const handle = await open(input, 'r');
  let header; let tag;
  try {
    header = Buffer.alloc(20); tag = Buffer.alloc(16);
    await handle.read(header, 0, 20, 0); await handle.read(tag, 0, 16, size - 16);
  } finally { await handle.close(); }
  if (!header.subarray(0, 8).equals(Buffer.from('ALCDB01\0'))) throw new OperationError('Unknown encrypted backup format');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(value), header.subarray(8, 20));
  decipher.setAuthTag(tag);
  const reservation = await open(output, 'wx', 0o600); await reservation.close();
  try {
    await pipeline(createReadStream(input, { start: 20, end: size - 17 }), decipher,
      createWriteStream(output, { flags: 'w', mode: 0o600 }));
  } catch (error) { await unlink(output).catch(() => undefined); throw error; }
}

export function assertRestoreTarget({ confirmation, target, manifest }) {
  if (confirmation !== 'isolated-empty-database') throw new OperationError('Explicit isolated restore confirmation required');
  if (target.sourceIdentity === manifest.sourceIdentity) throw new OperationError('Restoring into the source database is forbidden');
  if (target.tables.length !== 0) throw new OperationError('Restore target must have no user tables');
  if (target.databaseMajor !== manifest.databaseMajor) throw new OperationError('Restore target must use the source PostgreSQL major version');
}

export function assertRestoredCounts(expected, actual) {
  if (JSON.stringify(expected.tables) !== JSON.stringify(actual.tables)) throw new OperationError('Restored table names or row counts differ');
}

export { require, dirname };
