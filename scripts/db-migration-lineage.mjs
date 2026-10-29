import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const defaultFolder = new URL('../apps/api/drizzle/', import.meta.url);

/** Match Drizzle's SHA-256 of the actual SQL text; never baseline an unknown database. */
export async function readCandidateLineage(folder = defaultFolder) {
  const journal = JSON.parse(await readFile(new URL('meta/_journal.json', folder), 'utf8'));
  if (journal.dialect !== 'postgresql' || !Array.isArray(journal.entries) || !journal.entries.length) {
    throw new Error('Invalid candidate migration journal');
  }
  const candidates = [];
  for (const [index, entry] of journal.entries.entries()) {
    if (entry.idx !== index || !/^[0-9]+_[a-z0-9_]+$/.test(entry.tag ?? '') ||
        !Number.isSafeInteger(entry.when) || entry.when <= (candidates.at(-1)?.createdAt ?? 0)) {
      throw new Error('Candidate migrations must have unique tags and increasing timestamps');
    }
    if (candidates.some((candidate) => candidate.tag === entry.tag)) {
      throw new Error('Candidate migration tags must be unique');
    }
    const sql = await readFile(new URL(`${entry.tag}.sql`, folder), 'utf8');
    candidates.push({ tag: entry.tag, createdAt: entry.when, hash: createHash('sha256').update(sql).digest('hex') });
  }
  return candidates;
}

/** Only an exact prefix is safe for Drizzle's timestamp-based migration selection. */
export function assertMigrationLineage({ candidates, applied, hasUserTables }) {
  if (!applied.length && hasUserTables) {
    throw new Error('Existing tables without migration history require an explicit isolated data review');
  }
  if (applied.length > candidates.length) {
    throw new Error('Database migration history is not a prefix of the candidate');
  }
  for (const [index, row] of applied.entries()) {
    const expected = candidates[index];
    // pg returns bigint timestamps as strings. Reject null, rounded and malformed values.
    if (String(row.created_at) !== String(expected.createdAt) || row.hash !== expected.hash) {
      throw new Error('Database migration history diverges from the candidate; use an isolated data review');
    }
  }
  return { appliedMigrations: applied.length, pendingMigrations: candidates.length - applied.length };
}

/** Read-only, called while holding the same session lock as the subsequent migration. */
export async function assertDatabaseMigrationLineage(client, folder = defaultFolder) {
  const candidates = await readCandidateLineage(folder);
  const registry = (await client.query("select to_regclass('drizzle.__drizzle_migrations') as registry")).rows[0]?.registry;
  const applied = registry
    ? (await client.query('select hash, created_at from drizzle.__drizzle_migrations order by created_at asc, id asc')).rows
    : [];
  const hasUserTables = !applied.length && (await client.query(`select exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p', 'f')
      and n.nspname not in ('pg_catalog', 'information_schema')
      and n.nspname not like 'pg_toast%'
      and not (n.nspname = 'drizzle' and c.relname = '__drizzle_migrations')
  ) as present`)).rows[0]?.present;
  return assertMigrationLineage({ candidates, applied, hasUserTables });
}
