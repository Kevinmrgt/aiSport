import assert from 'node:assert/strict';
import test from 'node:test';
import { assertMigrationLineage, assertDatabaseMigrationLineage, inspectDatabaseMigrationLineage, readCandidateLineage } from './db-migration-lineage.mjs';
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

function inspectionClient({ registry = 'drizzle.__drizzle_migrations', rows = [], present = false, failOn } = {}) {
  const queries = [];
  return {
    queries,
    query: async (query) => {
      queries.push(query);
      if (failOn?.query === queries.length) throw failOn.error;
      if (query.includes('to_regclass')) return { rows: [{ registry }] };
      if (query.includes('order by')) return { rows };
      return { rows: [{ present }] };
    },
  };
}

test('read-only inspection reports only safe counts for pristine, prefix and current databases', async () => {
  const candidateRows = (await readCandidateLineage()).map(({ createdAt, hash }) => ({ created_at: String(createdAt), hash }));
  for (const [rows, registry] of [[[], null], [candidateRows.slice(0, 7), 'registry'], [candidateRows, 'registry']]) {
    const client = inspectionClient({ registry, rows });
    assert.deepEqual(await inspectDatabaseMigrationLineage(client), {
      compatible: true, appliedMigrations: rows.length, matchedPrefix: rows.length,
      pendingMigrations: candidateRows.length - rows.length,
    });
    assert.ok(client.queries.every((query) => query.trim().startsWith('select')));
  }
});

test('inspection identifies divergence and missing history without returning any registry values', async () => {
  const candidateRows = (await readCandidateLineage()).map(({ createdAt, hash }) => ({ created_at: String(createdAt), hash }));
  const divergentRows = [...candidateRows.slice(0, 7), { created_at: 'PRIVATE_TIMESTAMP_SENTINEL', hash: 'PRIVATE_HASH_SENTINEL' }];
  assert.deepEqual(await inspectDatabaseMigrationLineage(inspectionClient({ rows: divergentRows })), {
    compatible: false, appliedMigrations: 8, matchedPrefix: 7, reason: 'history_divergent',
  });
  for (const registry of [null, 'drizzle.__drizzle_migrations']) {
    assert.deepEqual(await inspectDatabaseMigrationLineage(inspectionClient({ registry, present: true })), {
      compatible: false, appliedMigrations: 0, matchedPrefix: 0, reason: 'history_missing',
    });
  }
});

test('inspection and enforcement propagate driver errors rather than reporting false divergence', async () => {
  const failure = new Error('PRIVATE_DRIVER_DIAGNOSTIC_SENTINEL');
  for (const query of [1, 2, 3]) {
    for (const inspect of [inspectDatabaseMigrationLineage, assertDatabaseMigrationLineage]) {
      await assert.rejects(inspect(inspectionClient({ failOn: { query, error: failure } })), (error) => error === failure);
    }
  }
});
