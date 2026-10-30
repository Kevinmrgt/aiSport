import assert from 'node:assert/strict';
import test from 'node:test';
import { runAdminBootstrap, targetDatabaseUrl, readSelectedAdminId } from './production-admin-bootstrap.mjs';

const adminId = '11111111-1111-4111-8111-111111111111';
const workoutId = '22222222-2222-4222-8222-222222222222';
const env = {
  SOURCE_DATABASE_URL: 'postgresql://private_role:private_password@private.invalid/legacy?sslmode=require',
  TARGET_DATABASE_NAME: 'alcide_fresh_candidate', BOOTSTRAP_ADMIN_EMAIL: 'private_admin@example.test',
};
const valid = { workouts: 0, training_programs: 0, session_logs: 0, user_settings: 0 };
function harness({ adminCount = 1, createdb = true, exists = false, accounts = [], incompatible = valid,
  foreignWorkout = false, targetFailure = false, createFailure = false, suspended = false, otherOwner = false,
  reuseTarget = false,
} = {}) {
  const queries = { source: [], control: [], target: [] };
  const sourceRows = {
    users: [{ id: adminId, name: 'PRIVATE_NAME', email: env.BOOTSTRAP_ADMIN_EMAIL, email_verified: null, image: null, created_at: new Date(0), updated_at: new Date(0) }],
    accounts,
    workouts: [{ id: workoutId, user_id: otherOwner ? workoutId : adminId, title: 'PRIVATE_WORKOUT', sport: 'course', difficulty: 'beginner', duration_minutes: 1,
      data: { title: 'PRIVATE_WORKOUT', sport: 'course', difficulty: 'beginner', duration_minutes: 1, exercises: [{ name: 'Course', description: 'Footing', duration_seconds: 60, rest_seconds: 0 }] }, created_at: new Date(0), updated_at: new Date(0) }],
    training_programs: [],
    session_logs: foreignWorkout ? [{ id: '33333333-3333-4333-8333-333333333333', user_id: adminId, workout_id: '44444444-4444-4444-8444-444444444444', program_id: null }] : [],
    user_settings: [{ id: '55555555-5555-4555-8555-555555555555', user_id: adminId, ai_provider: 'openai', ai_model: null, created_at: new Date(0), updated_at: new Date(0) }],
  };
  const imported = Object.fromEntries(Object.keys(sourceRows).map((table) => [table, []]));
  let connections = 0;
  const closed = [];
  const clientFactory = () => {
    const kind = (reuseTarget ? ['source', 'target'] : ['source', 'control', 'target'])[connections++];
    return {
      connect: async () => {}, end: async () => { closed.push(kind); },
      query: async (sql, values = []) => {
        queries[kind].push({ sql, values });
        if (kind === 'source') {
          if (sql.includes('from pg_roles')) return { rows: [{ rolcreatedb: createdb, rolsuper: false }] };
          if (sql.includes('from pg_database')) return { rows: [{ present: exists }] };
          if (sql.startsWith('select count(*)') && sql.includes('from public.users')) return { rows: [{ count: String(adminCount) }] };
          if (sql.includes('information_schema.columns')) return { rows: [{ present: true }] };
          if (sql.includes('suspended_at is not null')) return { rows: [{ suspended }] };
          if (sql.startsWith('select count(*)') && sql.includes('from public.accounts')) return { rows: [{ count: '1' }] };
          const table = sql.match(/from public\.(\w+)/)?.[1];
          if (table && sql.startsWith('select count(*)')) return { rows: [{ count: String(sourceRows[table]?.length ?? 0) }] };
          if (table) return { rows: sourceRows[table] };
        }
        if (kind === 'control' && createFailure) throw Object.assign(new Error('PRIVATE_DRIVER_ERROR'), { code: '42501' });
        if (kind === 'target') {
          if (sql === 'select current_database() as database') return { rows: [{ database: env.TARGET_DATABASE_NAME }] };
          if (sql.startsWith('select n.nspname as schema')) return { rows: [
            ...['users', 'accounts', 'workouts', 'training_programs', 'session_logs', 'user_settings', 'sessions', 'generation_quotas',
              'generation_control', 'generation_operations', 'generation_daily_budgets', 'generation_usage_events', 'account_revocations', 'session_log_operations']
              .map((name) => ({ schema: 'public', name })), { schema: 'drizzle', name: '__drizzle_migrations' },
          ] };
          if (sql.includes('from pg_class')) return { rows: [{ present: false }] };
          if (sql.startsWith('insert')) {
            if (targetFailure) throw new Error('PRIVATE_DRIVER_ERROR');
            const [, table, fields] = sql.match(/insert into public\.(\w+) \(([^)]+)\)/);
            imported[table].push(Object.fromEntries(fields.split(', ').map((field, index) => [field, field === 'data' ? JSON.parse(values[index]) : values[index]])));
          }
          if (sql.startsWith('select count(*)')) {
            if (sql.includes('from pg_constraint') || sql.includes('refresh_token') || sql.includes('ai_api_key_encrypted')) return { rows: [{ count: '0' }] };
            const table = sql.match(/from public\.(\w+)/)?.[1];
            return { rows: [{ count: String(imported[table]?.length ?? 0) }] };
          }
          const table = sql.match(/from public\.(\w+)/)?.[1];
          if (table) return { rows: imported[table].filter((row) => row.id === values[0]) };
        }
        return { rows: [] };
      },
    };
  };
  return { queries, imported, sourceRows, closed, dependencies: {
    clientFactory, validateData: async () => incompatible,
    migrateTarget: async (client) => { await client.query('select 13 as synthetic_migration_count'); },
    readLineage: async () => Array(13).fill({}),
    inspectTargetLineage: async () => ({ appliedMigrations: 13, pendingMigrations: 0 }),
  } };
}
function safe(report) { assert.doesNotMatch(JSON.stringify(report), /private_admin|private_role|private_password|private\.|PRIVATE_|11111111|22222222|postgresql|@|provider_account_id/); }
const apply = { ...env, BOOTSTRAP_MODE: 'apply', BOOTSTRAP_CONFIRM: 'selective-admin-copy-to-new-database' };

test('plan probes privileges, unique admin, counts and identity linkage with no database writes', async () => {
  const h = harness(); const result = await runAdminBootstrap(env, h.dependencies);
  assert.equal(result.complete, true); assert.equal(result.ready, true); assert.equal(result.createDatabasePrivilege, true);
  assert.equal(result.adminCount, 1); assert.equal(result.googleIdentityCount, 0); assert.equal(result.legacyGoogleLinkRequired, true);
  assert.equal(result.retainedRows.workouts, 1); assert.equal(result.retainedRows.user_settings, 1);
  assert.equal(result.targetCreated, false); assert.equal(h.queries.control.length, 0); assert.equal(h.queries.target.length, 0);
  assert.ok(h.queries.source.every(({ sql }) => sql.startsWith('select') || sql === 'begin isolation level repeatable read read only' || sql === 'rollback'));
  assert.ok(h.queries.source.every(({ sql }) => !sql.includes('select *') && !/access_token|refresh_token|ai_api_key_encrypted/.test(sql)));
  assert.deepEqual(h.closed, ['source']); safe(result);
});

test('apply creates only an absent new database and copies whitelisted admin rows without credentials', async () => {
  const accounts = [{ id: '66666666-6666-4666-8666-666666666666', user_id: adminId, type: 'oidc', provider: 'google', provider_account_id: 'PRIVATE_SUBJECT' }];
  const h = harness({ accounts }); const result = await runAdminBootstrap(apply, h.dependencies);
  assert.equal(result.complete, true); assert.equal(result.adminCopyVerified, true); assert.equal(result.targetCreated, true);
  assert.equal(result.googleIdentityCount, 1); assert.equal(result.legacyGoogleLinkRequired, false);
  assert.equal(h.queries.control[0].sql, 'create database "alcide_fresh_candidate" template template0');
  assert.equal(h.queries.control.length, 1);
  assert.equal(h.imported.users.length, 1); assert.equal(h.imported.users[0].id, adminId);
  assert.deepEqual(h.imported.accounts[0], accounts[0]);
  assert.ok(h.queries.target.filter(({ sql }) => sql.startsWith('insert')).every(({ sql }) => !/access_token|refresh_token|id_token|ai_api_key_encrypted|session_token/.test(sql)));
  assert.ok(h.queries.source.every(({ sql }) => !/\b(insert|update|delete|create|drop)\b/i.test(sql)));
  assert.ok(h.queries.target.some(({ sql }) => sql === 'commit')); assert.deepEqual(h.closed, ['target', 'control', 'source']); safe(result);
});

test('unsafe target names, source database, pooled endpoint and missing confirmation never connect', async () => {
  for (const change of [
    { TARGET_DATABASE_NAME: 'legacy' }, { TARGET_DATABASE_NAME: 'postgres' }, { TARGET_DATABASE_NAME: 'x"; drop database legacy' },
    { SOURCE_DATABASE_URL: env.SOURCE_DATABASE_URL.replace('private.invalid', 'private-pooler.invalid') },
    { BOOTSTRAP_CONFIRM: '' }, { BOOTSTRAP_ADMIN_USER_ID: 'not-a-uuid' }, { BOOTSTRAP_ADMIN_EMAIL: '' },
  ]) {
    const h = harness(); const result = await runAdminBootstrap({ ...apply, ...change }, h.dependencies);
    assert.equal(result.complete, false); assert.equal(result.targetCreated, false); assert.deepEqual(h.closed, []); safe(result);
  }
  assert.throws(() => targetDatabaseUrl(env.SOURCE_DATABASE_URL, 'template0'));
});

test('missing privileges, existing target, duplicate/missing admin and incompatible data prohibit creation', async () => {
  for (const change of [{ createdb: false }, { exists: true }, { adminCount: 0 }, { adminCount: 2 }, { suspended: true },
    { foreignWorkout: true }, { incompatible: { ...valid, workouts: 1 } }, { otherOwner: true }]) {
    const h = harness(change); const result = await runAdminBootstrap(apply, h.dependencies);
    assert.equal(result.targetCreated, false); assert.notEqual(result.ready, true);
    assert.equal(h.queries.control.length, 0); safe(result);
  }
});

test('an explicit UUID mismatch refuses the copy and never substitutes a different user', async () => {
  const h = harness(); const result = await runAdminBootstrap({ ...apply, BOOTSTRAP_ADMIN_USER_ID: workoutId }, h.dependencies);
  assert.equal(result.reason, 'admin_identity_mismatch'); assert.equal(h.queries.control.length, 0); safe(result);
});

test('permission and target-write failures stay private, preserve source and roll back import', async () => {
  const denied = harness({ createFailure: true }); const failedCreate = await runAdminBootstrap(apply, denied.dependencies);
  assert.equal(failedCreate.reason, 'database_permission_denied'); assert.equal(failedCreate.targetCreated, false); safe(failedCreate);
  const broken = harness({ targetFailure: true }); const failedCopy = await runAdminBootstrap(apply, broken.dependencies);
  assert.equal(failedCopy.complete, false); assert.equal(failedCopy.targetCreated, true); assert.equal(failedCopy.reason, 'private_diagnostics_required');
  assert.ok(broken.queries.target.some(({ sql }) => sql === 'rollback'));
  assert.ok(broken.queries.source.some(({ sql }) => sql === 'rollback'));
  assert.ok([...broken.queries.source, ...broken.queries.control, ...broken.queries.target].every(({ sql }) => !/\bdrop\b|\btruncate\b/i.test(sql)));
  safe(failedCopy);
});

test('a duplicate Google subject is rejected without selecting OAuth secrets', async () => {
  const identity = { id: workoutId, user_id: adminId, type: 'oidc', provider: 'google', provider_account_id: 'PRIVATE_SUBJECT' };
  const h = harness({ accounts: [identity, { ...identity, id: adminId }] });
  const result = await runAdminBootstrap(apply, h.dependencies);
  assert.equal(result.reason, 'duplicate_google_identity'); assert.equal(result.targetCreated, false); safe(result);
});

test('real shared schemas detect incompatible historical workout data without silently rewriting it', async () => {
  const good = harness(); delete good.dependencies.validateData;
  assert.equal((await runAdminBootstrap(env, good.dependencies)).ready, true);
  const bad = harness(); delete bad.dependencies.validateData;
  bad.sourceRows.workouts[0].data.exercises[0].duration_seconds = 59;
  const result = await runAdminBootstrap(apply, bad.dependencies);
  assert.equal(result.reason, 'admin_data_incompatible'); assert.equal(result.incompatibleRows.workouts, 1);
  assert.equal(bad.sourceRows.workouts[0].data.exercises[0].duration_seconds, 59);
  assert.equal(bad.queries.control.length, 0); safe(result);
});

test('invalid modes are reported as a fixed category rather than echoing input', async () => {
  const h = harness(); const result = await runAdminBootstrap({ ...env, BOOTSTRAP_MODE: 'PRIVATE_SECRET_MODE' }, h.dependencies);
  assert.equal(result.mode, 'invalid'); assert.equal(result.reason, 'invalid_mode'); safe(result);
});

test('target database name must be confirmed through SQL before migrations or inserts', async () => {
  const h = harness(); const original = h.dependencies.clientFactory;
  let created = 0;
  h.dependencies.clientFactory = (configuration) => {
    const client = original(configuration);
    if (++created === 3) {
      const query = client.query;
      client.query = async (sql, values) => sql === 'select current_database() as database'
        ? { rows: [{ database: 'legacy' }] } : query(sql, values);
    }
    return client;
  };
  const result = await runAdminBootstrap(apply, h.dependencies);
  assert.equal(result.reason, 'target_database_name_mismatch'); assert.equal(result.targetCreated, true);
  assert.equal(h.queries.target.some(({ sql }) => sql.startsWith('insert') || sql.includes('synthetic_migration_count')), false);
  safe(result);
});

test('account-only explicitly archives invalid histories and settings without reading, changing or importing their content', async () => {
  const h = harness({ foreignWorkout: true, incompatible: { ...valid, workouts: 1 } });
  h.sourceRows.workouts[0].data.exercises[0].duration_seconds = 59;
  const before = JSON.stringify(h.sourceRows);
  h.dependencies.validateData = async () => { throw Error('historical content must not be validated or loaded for account-only'); };
  const result = await runAdminBootstrap({ ...apply, ADMIN_IMPORT_POLICY: 'account-only' }, h.dependencies);
  assert.equal(result.complete, true); assert.equal(result.adminCopyVerified, true);
  assert.equal(result.importPolicy, 'account-only');
  assert.deepEqual(result.retainedRows, { users: 1, accounts: 0 });
  assert.deepEqual(result.copiedRowCounts, { users: 1, accounts: 0 });
  assert.deepEqual(result.archivedRows, { workouts: 1, training_programs: 0, session_logs: 1, user_settings: 1 });
  assert.equal(result.historyCompatibilityChecked, false); assert.equal(result.incompatibleRows, undefined);
  assert.equal(JSON.stringify(h.sourceRows), before);
  assert.equal(h.imported.users.length, 1);
  for (const table of ['workouts', 'training_programs', 'session_logs', 'user_settings']) {
    assert.equal(h.imported[table].length, 0);
    assert.ok(h.queries.source.filter(({ sql }) => sql.includes(`from public.${table}`)).every(({ sql }) => sql.startsWith('select count(*)')));
  }
  safe(result);
  const noOptIn = harness({ incompatible: { ...valid, workouts: 1 } });
  assert.equal((await runAdminBootstrap(apply, noOptIn.dependencies)).reason, 'admin_data_incompatible');
  assert.equal(noOptIn.queries.control.length, 0);
});

test('unknown import policies cannot enable account-only implicitly or leak input', async () => {
  const h = harness(); const result = await runAdminBootstrap({ ...env, ADMIN_IMPORT_POLICY: 'PRIVATE_SECRET_POLICY' }, h.dependencies);
  assert.equal(result.importPolicy, 'invalid'); assert.equal(result.reason, 'invalid_import_policy');
  assert.equal(h.closed.length, 0); safe(result);
});

test('selected admin UUID is returned only in memory after exact unique-email lookup in a read-only transaction', async () => {
  const queries = []; let closed = false;
  const result = await readSelectedAdminId(env.SOURCE_DATABASE_URL, env.BOOTSTRAP_ADMIN_EMAIL, {
    clientFactory: () => ({ connect: async () => {}, end: async () => { closed = true; },
      query: async (sql, values) => { queries.push(sql); if (sql.startsWith('select')) {
        assert.deepEqual(values, [env.BOOTSTRAP_ADMIN_EMAIL]); return { rows: [{ id: adminId }] };
      } return { rows: [] }; },
    }),
  });
  assert.equal(result, adminId); assert.equal(closed, true);
  assert.deepEqual(queries, ['begin isolation level repeatable read read only', 'select id from public.users where email = $1 limit 2', 'rollback']);
  for (const rows of [[], [{ id: adminId }, { id: workoutId }], [{ id: 'PRIVATE_INVALID_UUID' }]]) {
    await assert.rejects(readSelectedAdminId(env.SOURCE_DATABASE_URL, env.BOOTSTRAP_ADMIN_EMAIL, {
      clientFactory: () => ({ connect: async () => {}, end: async () => {}, query: async () => ({ rows }) }),
    }), /admin_not_unique/);
  }
  await assert.rejects(readSelectedAdminId(env.SOURCE_DATABASE_URL, env.BOOTSTRAP_ADMIN_EMAIL, {
    clientFactory: () => ({ connect: async () => { throw Error(env.SOURCE_DATABASE_URL); }, end: async () => {} }),
  }), (error) => error.message === 'admin_identity_lookup_failed');
});

const reuse = { ...apply, ADMIN_IMPORT_POLICY: 'account-only', BOOTSTRAP_REUSE_EXISTING: 'verified-admin-copy' };
function reusableHarness(options = {}) {
  const h = harness({ ...options, exists: true, reuseTarget: true });
  h.imported.users.push(structuredClone(h.sourceRows.users[0]));
  h.imported.accounts.push(...structuredClone(h.sourceRows.accounts));
  h.dependencies.migrateTarget = async () => { throw Error('existing target must never be migrated'); };
  return h;
}

test('explicit reuse verifies an exact account-only copy in plan and apply with read-only queries only', async () => {
  for (const mode of ['plan', 'apply']) {
    const h = reusableHarness({ createdb: false });
    const result = await runAdminBootstrap({ ...reuse, BOOTSTRAP_MODE: mode }, h.dependencies);
    assert.equal(result.complete, true); assert.equal(result.ready, true); assert.equal(result.targetCreated, false);
    assert.equal(result.targetReused, true); assert.equal(result.existingTargetVerified, true);
    assert.equal(result.adminCopyVerified, mode === 'apply' ? true : undefined);
    assert.deepEqual(result.verifiedRowCounts, { users: 1, accounts: 0 });
    assert.equal(result.migrationCount, 13); assert.equal(h.queries.control.length, 0);
    assert.ok(h.queries.source.concat(h.queries.target).every(({ sql }) => sql.startsWith('select') || sql === 'begin isolation level repeatable read read only' || sql === 'rollback'));
    assert.deepEqual(h.closed, ['target', 'source']); safe(result);
  }
});

test('existing target still requires exact opt-in and account-only policy', async () => {
  for (const change of [{ BOOTSTRAP_REUSE_EXISTING: undefined }, { BOOTSTRAP_REUSE_EXISTING: 'PRIVATE_BAD_CONFIRM' },
    { ADMIN_IMPORT_POLICY: 'compatible-history' }, { TARGET_DATABASE_NAME: 'legacy' }]) {
    const h = reusableHarness(); const result = await runAdminBootstrap({ ...reuse, ...change }, h.dependencies);
    assert.equal(result.ready, false); assert.notEqual(result.targetReused, true); assert.notEqual(result.adminCopyVerified, true);
    assert.equal(h.queries.control.length, 0); assert.equal(h.queries.target.length, 0); safe(result);
  }
});

test('reuse rejects modified profile, UUID, accounts, histories, settings, sessions or counters without repairing them', async () => {
  const mutations = [
    (h) => h.imported.users.push({ ...h.imported.users[0], id: workoutId }),
    (h) => { h.imported.users[0].name = 'PRIVATE_CHANGED_PROFILE'; },
    (h) => { h.imported.users[0].id = workoutId; },
    (h) => h.imported.accounts.push({ id: workoutId, user_id: adminId, provider: 'google', provider_account_id: 'PRIVATE_SUBJECT' }),
    ...['workouts', 'training_programs', 'session_logs', 'user_settings', 'sessions', 'generation_quotas', 'generation_control',
      'generation_operations', 'generation_daily_budgets', 'generation_usage_events', 'account_revocations', 'session_log_operations']
      .map((table) => (h) => { h.imported[table] = [{ id: workoutId }]; }),
  ];
  for (const mutate of mutations) {
    const h = reusableHarness(); mutate(h); const before = JSON.stringify(h.imported);
    const result = await runAdminBootstrap(reuse, h.dependencies);
    assert.equal(result.complete, false); assert.equal(result.ready, false); assert.notEqual(result.targetReused, true);
    assert.equal(result.targetCreated, false); assert.equal(JSON.stringify(h.imported), before);
    assert.ok(h.queries.source.concat(h.queries.target).every(({ sql }) => !/\b(insert|update|delete|create|alter|drop|truncate)\b/i.test(sql)));
    safe(result);
  }
});

test('reuse rejects incomplete or divergent migration history, unexpected tables, credentials and unvalidated FKs', async () => {
  for (const failure of ['pending', 'divergent', 'tables', 'credentials', 'foreign_keys', 'database_name']) {
    const h = reusableHarness();
    if (failure === 'pending') h.dependencies.inspectTargetLineage = async () => ({ appliedMigrations: 12, pendingMigrations: 1 });
    if (failure === 'divergent') h.dependencies.inspectTargetLineage = async () => { throw Error('PRIVATE_DRIVER_HISTORY'); };
    const factory = h.dependencies.clientFactory; let connections = 0;
    h.dependencies.clientFactory = (configuration) => {
      const client = factory(configuration);
      if (++connections === 2) {
        const query = client.query;
        client.query = async (sql, values) => {
          if (failure === 'database_name' && sql === 'select current_database() as database') return { rows: [{ database: 'legacy' }] };
          if (failure === 'credentials' && sql.includes('where refresh_token')) return { rows: [{ count: '1' }] };
          if (failure === 'foreign_keys' && sql.includes('from pg_constraint')) return { rows: [{ count: '1' }] };
          const response = await query(sql, values);
          if (failure === 'tables' && sql.startsWith('select n.nspname as schema')) response.rows.push({ schema: 'public', name: 'unexpected_archive' });
          return response;
        };
      }
      return client;
    };
    const result = await runAdminBootstrap(reuse, h.dependencies);
    assert.equal(result.complete, false); assert.equal(result.ready, false); assert.notEqual(result.existingTargetVerified, true);
    assert.equal(result.targetCreated, false); assert.equal(h.queries.control.length, 0); safe(result);
  }
});
