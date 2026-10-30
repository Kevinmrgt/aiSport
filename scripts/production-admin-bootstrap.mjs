import { writeFile } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { Client, databaseUrl, require, migrationsFolder } from './db-operations.mjs';
import { assertDatabaseMigrationLineage, readCandidateLineage } from './db-migration-lineage.mjs';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const pgTypes = require('pg').types;
// Keep PostgreSQL microseconds; JS Date would silently round the copied timestamps.
const exactTimestampTypes = { getTypeParser: (oid, format) =>
  [1114, 1184].includes(oid) && (!format || format === 'text') ? (value) => value : pgTypes.getTypeParser(oid, format) };
const columns = {
  users: ['id', 'name', 'email', 'email_verified', 'image', 'created_at', 'updated_at'],
  accounts: ['id', 'user_id', 'type', 'provider', 'provider_account_id'],
  workouts: ['id', 'user_id', 'title', 'sport', 'difficulty', 'duration_minutes', 'data', 'created_at', 'updated_at'],
  training_programs: ['id', 'user_id', 'title', 'sport', 'difficulty', 'weeks_count', 'sessions_per_week', 'session_duration_minutes', 'data', 'created_at', 'updated_at'],
  session_logs: ['id', 'user_id', 'source_type', 'workout_id', 'program_id', 'program_week_number', 'program_session_number', 'title', 'sport', 'difficulty', 'planned_duration_minutes', 'completed_at', 'duration_seconds', 'perceived_effort', 'feedback', 'pain_notes', 'notes', 'created_at'],
  user_settings: ['id', 'user_id', 'ai_provider', 'ai_model', 'created_at', 'updated_at'],
};
class BootstrapError extends Error {
  constructor(reason) { super(reason); this.reason = reason; }
}
const fail = (reason) => { throw new BootstrapError(reason); };

export function targetDatabaseUrl(sourceValue, targetName) {
  const source = databaseUrl(sourceValue);
  if (!/^[a-z][a-z0-9_]{2,62}$/.test(targetName ?? '') || ['postgres', 'template0', 'template1'].includes(targetName) ||
      targetName === decodeURIComponent(source.pathname.slice(1))) fail('invalid_new_database_name');
  source.pathname = `/${targetName}`;
  return source.toString();
}

/** Private return value for orchestration memory only. Never include it in evidence or logs. */
export async function readSelectedAdminId(sourceValue, adminEmail, {
  clientFactory = (configuration) => new Client(configuration),
} = {}) {
  let client;
  try {
    const url = databaseUrl(sourceValue);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail ?? '')) fail('explicit_admin_email_required');
    client = clientFactory({ connectionString: url.toString(), connectionTimeoutMillis: 15_000, statement_timeout: 30_000 });
    await client.connect();
    await client.query('begin isolation level repeatable read read only');
    const rows = (await client.query('select id from public.users where email = $1 limit 2', [adminEmail])).rows;
    if (rows.length !== 1 || !uuid.test(rows[0]?.id ?? '')) fail('admin_not_unique');
    await client.query('rollback');
    return rows[0].id;
  } catch (error) {
    if (error instanceof BootstrapError) throw error;
    fail('admin_identity_lookup_failed');
  } finally {
    if (client) await client.end().catch(() => undefined);
  }
}

async function validateStoredData(rows) {
  const { WorkoutSchema, TrainingProgramSchema } = await import('../packages/shared/dist/index.js');
  return {
    workouts: rows.workouts.filter((row) => !WorkoutSchema.safeParse(row.data).success ||
      row.duration_minutes !== row.data?.duration_minutes || row.difficulty !== row.data?.difficulty ||
      row.duration_minutes > 180 || row.sport !== row.data?.sport || row.title !== row.data?.title).length,
    training_programs: rows.training_programs.filter((row) => !TrainingProgramSchema.safeParse(row.data).success ||
      row.weeks_count !== row.data?.weeks_count || row.sessions_per_week !== row.data?.sessions_per_week ||
      row.session_duration_minutes !== row.data?.session_duration_minutes || row.difficulty !== row.data?.difficulty ||
      row.sport !== row.data?.sport || row.title !== row.data?.title).length,
    session_logs: rows.session_logs.filter((row) => !['workout', 'program_session'].includes(row.source_type) ||
      !['beginner', 'intermediate', 'advanced'].includes(row.difficulty) || !['too_easy', 'good', 'too_hard'].includes(row.feedback) ||
      !Number.isInteger(row.duration_seconds) || row.duration_seconds < 0 || !Number.isInteger(row.perceived_effort) ||
      row.perceived_effort < 1 || row.perceived_effort > 10 || !Number.isInteger(row.planned_duration_minutes) || row.planned_duration_minutes <= 0).length,
    user_settings: rows.user_settings.filter((row) => row.ai_provider !== 'openai').length,
  };
}

async function migrateNewTarget(client) {
  const { drizzle } = require('drizzle-orm/node-postgres');
  const { migrate } = require('drizzle-orm/node-postgres/migrator');
  const locked = (await client.query('select pg_try_advisory_lock(1946010371, 1) as locked')).rows[0]?.locked;
  if (!locked) fail('target_migration_lock_unavailable');
  try {
    await assertDatabaseMigrationLineage(client, migrationsFolder);
    await migrate(drizzle(client), { migrationsFolder: fileURLToPath(migrationsFolder) });
    const after = await assertDatabaseMigrationLineage(client, migrationsFolder);
    if (after.appliedMigrations !== 13 || after.pendingMigrations !== 0) fail('target_migration_verification_failed');
  } finally {
    await client.query('select pg_advisory_unlock(1946010371, 1)').catch(() => undefined);
  }
}

async function readAdminSnapshot(client, configuration, validateData) {
  const role = (await client.query('select rolcreatedb, rolsuper from pg_roles where rolname = current_user')).rows[0];
  const targetExists = (await client.query('select exists(select 1 from pg_database where datname = $1) as present', [configuration.targetName])).rows[0].present;
  const adminCount = Number((await client.query('select count(*)::text as count from public.users where email = $1', [configuration.adminEmail])).rows[0].count);
  const base = { createDatabasePrivilege: Boolean(role?.rolcreatedb || role?.rolsuper), targetExists, adminCount };
  if (adminCount !== 1) return { report: { ...base, ready: false, reason: 'admin_not_unique' } };
  const user = (await client.query(`select ${columns.users.join(', ')} from public.users where email = $1`, [configuration.adminEmail])).rows[0];
  if (!uuid.test(user?.id ?? '') || user.email !== configuration.adminEmail || (configuration.adminId && user.id !== configuration.adminId)) fail('admin_identity_mismatch');
  const suspendedColumn = (await client.query("select exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'users' and column_name = 'suspended_at') as present")).rows[0].present;
  const suspended = suspendedColumn && (await client.query('select suspended_at is not null as suspended from public.users where id = $1', [user.id])).rows[0].suspended;
  const rows = { users: [user] };
  const archivedRows = {};
  for (const table of Object.keys(columns).filter((name) => name !== 'users')) {
    if (configuration.importPolicy === 'account-only' && table !== 'accounts') {
      const count = Number((await client.query(`select count(*)::text as count from public.${table} where user_id = $1`, [user.id])).rows[0].count);
      if (!Number.isSafeInteger(count) || count < 0) fail('invalid_archive_count');
      archivedRows[table] = count;
      rows[table] = [];
      continue;
    }
    rows[table] = (await client.query(`select ${columns[table].join(', ')} from public.${table} where user_id = $1${table === 'accounts' ? " and provider = 'google'" : ''} order by id limit 10001`, [user.id])).rows;
    if (rows[table].length > 10_000) fail('admin_data_limit_exceeded');
    if (rows[table].some((row) => row.user_id !== user.id)) fail('admin_ownership_mismatch');
  }
  if (rows.accounts.some((row) => row.provider !== 'google' || !row.provider_account_id || !['oauth', 'oidc'].includes(row.type))) fail('invalid_google_identity');
  const subjects = rows.accounts.map((row) => row.provider_account_id);
  if (new Set(subjects).size !== subjects.length) fail('duplicate_google_identity');
  for (const subject of subjects) {
    const count = Number((await client.query("select count(*)::text as count from public.accounts where provider = 'google' and provider_account_id = $1", [subject])).rows[0].count);
    if (count !== 1) fail('google_identity_not_unique');
  }
  const workouts = new Set(rows.workouts.map((row) => row.id));
  const programs = new Set(rows.training_programs.map((row) => row.id));
  const foreignKeyIssues = rows.session_logs.filter((row) => (row.workout_id && !workouts.has(row.workout_id)) ||
    (row.program_id && !programs.has(row.program_id))).length;
  const incompatible = configuration.importPolicy === 'account-only' ? null : await validateData(rows);
  if (incompatible && (Object.keys(incompatible).sort().join(',') !== 'session_logs,training_programs,user_settings,workouts' ||
      Object.values(incompatible).some((count) => !Number.isSafeInteger(count) || count < 0))) fail('invalid_compatibility_diagnostic');
  const reason = targetExists ? 'target_already_exists' : !base.createDatabasePrivilege ? 'create_database_privilege_missing' :
    suspended ? 'admin_suspended_review_required' : foreignKeyIssues ? 'admin_foreign_keys_invalid' :
    incompatible && Object.values(incompatible).some((count) => count > 0) ? 'admin_data_incompatible' : null;
  return { rows, report: { ...base, ready: reason === null, ...(reason ? { reason } : {}),
    googleIdentityCount: rows.accounts.length, legacyGoogleLinkRequired: rows.accounts.length === 0,
    retainedRows: Object.fromEntries(Object.entries(rows).filter(([table]) => configuration.importPolicy !== 'account-only' || ['users', 'accounts'].includes(table)).map(([table, records]) => [table, records.length])),
    ...(configuration.importPolicy === 'account-only' ? { archivedRows, historyCompatibilityChecked: false } : { incompatibleRows: incompatible }), foreignKeyIssues } };
}

async function insertSelectedRows(client, rows) {
  for (const [table, fields] of Object.entries(columns)) {
    for (const row of rows[table]) {
      const values = fields.map((field) => field === 'data' ? JSON.stringify(row[field]) : row[field]);
      await client.query(`insert into public.${table} (${fields.join(', ')}) values (${fields.map((_, index) => `$${index + 1}`).join(', ')})`, values);
    }
  }
}

async function verifySelectedRows(client, rows) {
  for (const table of Object.keys(columns)) {
    const count = Number((await client.query(`select count(*)::text as count from public.${table}`)).rows[0].count);
    if (count !== rows[table].length) fail('target_row_count_verification_failed');
    const fields = columns[table];
    for (const row of rows[table]) {
      const copied = (await client.query(`select ${fields.join(', ')} from public.${table} where id = $1`, [row.id])).rows[0];
      // pg parsers preserve the same JS values on both source and target connections.
      if (JSON.stringify(copied) !== JSON.stringify(Object.fromEntries(fields.map((field) => [field, row[field]])))) fail('target_content_verification_failed');
    }
  }
  const foreignKeys = Number((await client.query("select count(*)::text as count from pg_constraint where contype = 'f' and not convalidated")).rows[0].count);
  if (foreignKeys !== 0) fail('target_foreign_key_verification_failed');
  for (const table of ['sessions', 'generation_quotas', 'generation_operations', 'generation_daily_budgets', 'generation_usage_events', 'account_revocations', 'session_log_operations']) {
    if (Number((await client.query(`select count(*)::text as count from public.${table}`)).rows[0].count) !== 0) fail('unexpected_target_data');
  }
  const credentials = Number((await client.query(`select count(*)::text as count from public.accounts where refresh_token is not null or access_token is not null or id_token is not null or session_state is not null`)).rows[0].count);
  const keys = Number((await client.query('select count(*)::text as count from public.user_settings where ai_api_key_encrypted is not null')).rows[0].count);
  if (credentials || keys) fail('unexpected_target_credentials');
}

export async function runAdminBootstrap(env, {
  clientFactory = (configuration) => new Client(configuration),
  validateData = validateStoredData, migrateTarget = migrateNewTarget,
  readLineage = readCandidateLineage,
} = {}) {
  const mode = env.BOOTSTRAP_MODE ?? 'plan';
  const importPolicy = env.ADMIN_IMPORT_POLICY ?? 'compatible-history';
  const report = { performedAt: new Date().toISOString(), scope: 'selective-admin-copy-to-new-database', mode: ['plan', 'apply'].includes(mode) ? mode : 'invalid', importPolicy: ['compatible-history', 'account-only'].includes(importPolicy) ? importPolicy : 'invalid', sourceReadOnly: true, complete: false, targetCreated: false };
  let source; let control; let target; let sourceTransaction = false; let targetTransaction = false;
  try {
    if (!['plan', 'apply'].includes(report.mode)) fail('invalid_mode');
    if (!['compatible-history', 'account-only'].includes(report.importPolicy)) fail('invalid_import_policy');
    const sourceUrl = databaseUrl(env.SOURCE_DATABASE_URL);
    const targetUrl = targetDatabaseUrl(env.SOURCE_DATABASE_URL, env.TARGET_DATABASE_NAME);
    if (sourceUrl.hostname.includes('-pooler.')) fail('direct_source_endpoint_required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.BOOTSTRAP_ADMIN_EMAIL ?? '')) fail('explicit_admin_email_required');
    if (env.BOOTSTRAP_ADMIN_USER_ID && !uuid.test(env.BOOTSTRAP_ADMIN_USER_ID)) fail('invalid_admin_uuid');
    if ((await readLineage()).length !== 13) fail('unexpected_candidate_migration_count');
    report.candidateMigrationCount = 13;
    if (report.mode === 'apply' && env.BOOTSTRAP_CONFIRM !== 'selective-admin-copy-to-new-database') fail('explicit_bootstrap_confirmation_required');
    report.endpointMode = 'direct'; report.targetDatabaseName = env.TARGET_DATABASE_NAME;
    const connect = async (url) => {
      const client = clientFactory({ connectionString: url, connectionTimeoutMillis: 15_000, statement_timeout: 30_000, query_timeout: 35_000, types: exactTimestampTypes });
      try { await client.connect(); return client; } catch (error) { await client.end().catch(() => undefined); throw error; }
    };
    source = await connect(sourceUrl.toString());
    await source.query('begin isolation level repeatable read read only'); sourceTransaction = true;
    const snapshot = await readAdminSnapshot(source, { targetName: env.TARGET_DATABASE_NAME, adminEmail: env.BOOTSTRAP_ADMIN_EMAIL, adminId: env.BOOTSTRAP_ADMIN_USER_ID, importPolicy }, validateData);
    Object.assign(report, snapshot.report);
    if (report.mode === 'plan' || !report.ready) { report.complete = true; return report; }
    control = await connect(sourceUrl.toString());
    // PostgreSQL cannot CREATE DATABASE inside a transaction. This changes only a new database.
    await control.query(`create database "${env.TARGET_DATABASE_NAME}" template template0`);
    report.targetCreated = true;
    target = await connect(targetUrl);
    if ((await target.query('select current_database() as database')).rows[0]?.database !== env.TARGET_DATABASE_NAME) fail('target_database_name_mismatch');
    if ((await target.query("select exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p','f') and n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%') as present")).rows[0].present) fail('target_not_empty');
    await migrateTarget(target);
    report.migrationCount = 13;
    await target.query('begin'); targetTransaction = true;
    await insertSelectedRows(target, snapshot.rows);
    await verifySelectedRows(target, snapshot.rows);
    await target.query('commit'); targetTransaction = false;
    report.complete = true; report.adminCopyVerified = true;
    report.copiedRowCounts = report.retainedRows;
    report.googleIdentityLinked = report.googleIdentityCount > 0;
    return report;
  } catch (error) {
    report.ready = false;
    report.reason = error instanceof BootstrapError ? error.reason : error?.code === '42501' ? 'database_permission_denied' :
      error?.code === '42P04' ? 'target_already_exists' : 'private_diagnostics_required';
    return report;
  } finally {
    if (targetTransaction) await target.query('rollback').catch(() => undefined);
    if (sourceTransaction) await source.query('rollback').catch(() => undefined);
    for (const client of [target, control, source]) if (client) await client.end().catch(() => undefined);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runAdminBootstrap(process.env);
  if (process.env.BOOTSTRAP_EVIDENCE_FILE) await writeFile(process.env.BOOTSTRAP_EVIDENCE_FILE, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify(result));
  if (!result.complete || !result.ready || (result.mode === 'apply' && !result.adminCopyVerified)) process.exitCode = 1;
}
