import { Client, databaseUrl, require, migrationsFolder, OperationError } from './db-operations.mjs';
import { fileURLToPath } from 'node:url';
import { assertDatabaseMigrationLineage } from './db-migration-lineage.mjs';

const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');
let client;
let locked = false;
try {
  const migrationUrl = databaseUrl(process.env['MIGRATION_DATABASE_URL'] || process.env['DATABASE_URL']);
  if (migrationUrl.hostname.includes('-pooler.')) {
    throw new OperationError('A direct PostgreSQL endpoint is required for session-scoped migration locking');
  }
  client = new Client({ connectionString: migrationUrl.toString(), connectionTimeoutMillis: 15_000 });
  await client.connect();
  // One stable, session-scoped database lock for every production migration entry point.
  // It also serializes distinct checkouts or workflows, independently of GitHub groups.
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    locked = (await client.query('select pg_try_advisory_lock(1946010371, 1) as locked')).rows[0].locked;
    if (locked) break;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  if (!locked) throw new OperationError('Timed out waiting for the production migration lock');
  // Drizzle compares only the latest timestamp; reject another branch before it writes.
  await assertDatabaseMigrationLineage(client, migrationsFolder);
  await migrate(drizzle(client), { migrationsFolder: fileURLToPath(migrationsFolder) });
  console.log(JSON.stringify({ result: 'migrations_applied', revision: process.env['RELEASE_REVISION'] ?? null }));
} catch {
  // Do not print raw driver errors, SQL parameters or credentials.
  console.error('Migration failed or lock unavailable; inspect the isolated rehearsal before retrying production');
  process.exitCode = 1;
} finally {
  if (client) {
    if (locked) await client.query('select pg_advisory_unlock(1946010371, 1)').catch(() => undefined);
    await client.end().catch(() => undefined);
  }
}
