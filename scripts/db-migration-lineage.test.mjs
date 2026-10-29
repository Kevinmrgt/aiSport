import assert from 'node:assert/strict';
import test from 'node:test';
import { assertMigrationLineage, assertDatabaseMigrationLineage, readCandidateLineage } from './db-migration-lineage.mjs';
import { require } from './db-operations.mjs';
import { fileURLToPath } from 'node:url';

const candidates = [
  { createdAt: 100, hash: 'a'.repeat(64) },
  { createdAt: 200, hash: 'b'.repeat(64) },
  { createdAt: 300, hash: 'c'.repeat(64) },
];
const applied = candidates.map(({ createdAt, hash }) => ({ created_at: String(createdAt), hash }));

test('accepts a pristine database, an exact prefix and an already current database', () => {
  assert.deepEqual(assertMigrationLineage({ candidates, applied: [], hasUserTables: false }), { appliedMigrations: 0, pendingMigrations: 3 });
  assert.deepEqual(assertMigrationLineage({ candidates, applied: applied.slice(0, 2), hasUserTables: true }), { appliedMigrations: 2, pendingMigrations: 1 });
  assert.equal(assertMigrationLineage({ candidates, applied, hasUserTables: true }).pendingMigrations, 0);
});

test('refuses divergent hashes or timestamps, missing/reordered rows and a newer database', () => {
  const histories = [
    [{ ...applied[0], hash: 'd'.repeat(64) }],
    [{ ...applied[0], created_at: '99' }],
    [{ ...applied[0], created_at: null }],
    [{ ...applied[0], created_at: '0100' }],
    [applied[1]], [applied[1], applied[0]], [applied[0], applied[0]],
    [...applied, { created_at: '400', hash: 'd'.repeat(64) }],
    // A different branch can have dates older than every pending local migration.
    [applied[0], { created_at: '150', hash: 'd'.repeat(64) }],
  ];
  for (const history of histories) {
    assert.throws(() => assertMigrationLineage({ candidates, applied: history, hasUserTables: true }), /prefix|diverge/);
  }
});

test('refuses a populated database without applied history, including an empty registry', async () => {
  for (const registry of [null, 'drizzle.__drizzle_migrations']) {
    const queries = [];
    const client = { query: async (query) => {
      queries.push(query);
      if (query.includes('to_regclass')) return { rows: [{ registry }] };
      if (query.includes('order by')) return { rows: [] };
      return { rows: [{ present: true }] };
    } };
    await assert.rejects(assertDatabaseMigrationLineage(client), /without migration history/);
    assert.ok(queries.every((query) => query.trim().startsWith('select')), 'guard must not create or mutate the registry');
  }
});

test('candidate hashes and timestamps exactly match the installed Drizzle reader', async () => {
  const { readMigrationFiles } = require('drizzle-orm/migrator');
  const drizzle = readMigrationFiles({ migrationsFolder: fileURLToPath(new URL('../apps/api/drizzle/', import.meta.url)) });
  const lineage = await readCandidateLineage();
  assert.deepEqual(lineage.map(({ createdAt, hash }) => ({ createdAt, hash })), drizzle.map(({ folderMillis, hash }) => ({ createdAt: folderMillis, hash })));
});
