import assert from 'node:assert/strict';
import test from 'node:test';
import {
  qualifyProductionAdmin,
  readRecipeSnapshot,
  recipeKeys,
  CONFIRMATION,
  AUTH_MODE,
  API_ORIGIN,
  WEB_ORIGIN,
} from './qualify-production-admin.mjs';

const OWNER = '11111111-1111-4111-8111-111111111111';
const WORKOUT = '22222222-2222-4222-8222-222222222222';
const PROGRAM = '33333333-3333-4333-8333-333333333333';
const LEGACY = '44444444-4444-4444-8444-444444444444';
const UNKNOWN = '55555555-5555-4555-8555-555555555555';
const SUBJECT = 'existing-private-google-subject';
const SECRET = 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6';
const NAME = 'Élodie privée 100%';
const REVISION = 'a'.repeat(40),
  DAY = '2031-02-03';
const DB =
  'postgresql://private_user:private_password@db.invalid/alcide_recipe_test?sslmode=require';
const clone = (value) => structuredClone(value);
const response = (body, status = 200) => Response.json(body, { status });
function session(minutes, session_number = 1) {
  const work = minutes * 60 - 300;
  return {
    planning_version: 2,
    session_number,
    title: 'Séance privée de marche',
    focus: 'Endurance confortable',
    duration_minutes: minutes,
    exercises: [
      {
        name: 'Marche',
        description: 'Allure confortable',
        sets: 1,
        duration_seconds: work,
        rest_seconds: 0,
        prescription: {
          version: 2,
          category: 'cardio',
          mode: 'continuous',
          sets: 1,
          work_seconds: work,
          rest_seconds: 0,
          transition_seconds: 0,
        },
      },
    ],
    warmup: [{ name: 'Préparation', description: 'Mouvements doux', duration_seconds: 180 }],
    cooldown: [
      { name: 'Retour calme', description: 'Ralentir progressivement', duration_seconds: 120 },
    ],
  };
}
function fixture(options = {}) {
  const env = {
    ADMIN_RECIPE_CONFIRM: CONFIRMATION,
    GITHUB_ACTIONS: 'true',
    GITHUB_RUN_ID: '123',
    GITHUB_RUN_ATTEMPT: '1',
    RELEASE_REVISION: REVISION,
    TARGET_DATABASE_NAME: 'alcide_recipe_test',
    BOOTSTRAP_ADMIN_EMAIL: 'owner@private.invalid',
    VERCEL_TOKEN: 'private-provider-token',
    VERCEL_ORG_ID: 'org-private',
    VERCEL_API_PROJECT_ID: 'api-private',
    VERCEL_WEB_PROJECT_ID: 'web-private',
    GITHUB_TOKEN: 'private-ci-token',
    GITHUB_REPOSITORY: 'owner/project',
    RUNNER_TEMP: '/runner/private',
    ADMIN_RECIPE_EVIDENCE_FILE: '/runner/private/admin-recipe.json',
    ...options.env,
  };
  const api = {
    SERVICE_SECRET: SECRET,
    PRODUCTION_ACCESS_MODE: 'admin-only',
    ADMIN_EMAILS: env.BOOTSTRAP_ADMIN_EMAIL,
    BOOTSTRAP_ADMIN_USER_ID: OWNER,
    ALCIDE_DATABASE_URL: DB,
    FRONTEND_URL: WEB_ORIGIN,
    APP_REVISION: REVISION,
    ...options.api,
  };
  const web = {
    SERVICE_SECRET: SECRET,
    PRODUCTION_ACCESS_MODE: 'admin-only',
    ADMIN_EMAILS: env.BOOTSTRAP_ADMIN_EMAIL,
    APP_REVISION: REVISION,
    API_URL: API_ORIGIN,
    NEXT_PUBLIC_API_URL: API_ORIGIN,
    AUTH_URL: WEB_ORIGIN,
    NEXTAUTH_URL: WEB_ORIGIN,
    ...options.web,
  };
  const state = {
    day: DAY,
    owner: { id: OWNER, email: env.BOOTSTRAP_ADMIN_EMAIL, name: NAME, subject: SUBJECT },
    available: 5,
    operations: [
      {
        id: LEGACY,
        key: 'legacy-key',
        kind: 'workout',
        status: 'succeeded',
        resource: LEGACY,
        attempts: 1,
        reserved: 1000,
        input: 40,
        output: 60,
        day: DAY,
        expired: true,
        events: 1,
        legacy_receipts: 1,
        receipts: 0,
        measured_input: 40,
        measured_output: 60,
        measured_total: 100,
      },
      {
        id: UNKNOWN,
        key: 'unknown-key',
        kind: 'program',
        status: 'failed',
        resource: UNKNOWN,
        attempts: 4,
        reserved: 4444,
        input: 200,
        output: 133,
        day: DAY,
        expired: true,
        events: 3,
        legacy_receipts: 3,
        receipts: 0,
        measured_input: 200,
        measured_output: 133,
        measured_total: 333,
      },
    ],
    daily: ['global', `user:${OWNER}`].map((scope) => ({
      scope,
      attempts: 5,
      reserved: 5444,
      input: 240,
      output: 193,
    })),
    reservations: [],
    refund: [],
  };
  if (options.nonOwner) state.owner.id = UNKNOWN;
  if (options.insufficientCredits) state.available = 2;
  const privateBodies = new Map(),
    calls = [],
    reports = [],
    refundRequests = [],
    deleted = [],
    factoryOptions = [];
  let clientsClosed = 0,
    ciCalls = 0,
    healthCalls = 0,
    snapshots = 0;
  const workout = {
    id: WORKOUT,
    title: 'Sortie privée',
    sport: 'marche',
    difficulty: 'beginner',
    durationMinutes: 15,
    ...session(15),
  };
  const programData = {
    planning_version: 2,
    title: 'Programme privé',
    sport: 'marche',
    difficulty: 'beginner',
    weeks_count: 2,
    sessions_per_week: 2,
    session_duration_minutes: 20,
    progression_summary: 'Progression douce',
    weeks: [1, 2].map((week_number) => ({
      week_number,
      theme: 'Régularité',
      objective: 'Endurance',
      sessions: [session(20, 1), session(20, 2)],
    })),
  };
  const dependencies = {
    now: () => Date.UTC(2031, 1, 3, 12),
    evidence: async () => ({
      write: async (report) => reports.push(clone(report)),
      close: async () => {},
    }),
    provider: {
      aliasDeployment: async (project) => {
        const component = project === 'api-private' ? 'api' : 'web';
        const move =
          (options.moveBeforeBusiness && snapshots > 0) ||
          (options.moveAfterGeneration &&
            calls.some((call) => call.method === 'POST' && call.path.endsWith('/generate'))) ||
          (options.moveAfterCleanup &&
            deleted.length === 2 &&
            calls.at(-1)?.method === 'GET' &&
            calls.at(-1)?.path.endsWith(PROGRAM));
        return {
          component,
          alias:
            options.foreignAlias && component === 'api'
              ? 'foreign.invalid'
              : new URL(component === 'api' ? API_ORIGIN : WEB_ORIGIN).hostname,
          deploymentId: options.badDeploymentId
            ? 'invalid'
            : `dpl_${component}${move ? 'Moved' : ''}`,
          url: `https://${component}-owned.vercel.app`,
        };
      },
      request: async (path) => {
        assert.match(path, /^\/v13\/deployments\/dpl_(api|web)(Moved)?$/);
        const id = path.split('/').at(-1),
          component = id.startsWith('dpl_api') ? 'api' : 'web';
        return {
          id: options.mismatchedDeployment ? 'dpl_unrelated' : id,
          projectId: options.foreignProject
            ? 'foreign-private'
            : component === 'api'
              ? 'api-private'
              : 'web-private',
          url: options.mismatchedDeploymentUrl
            ? 'foreign.vercel.app'
            : `${component}-owned.vercel.app`,
          readyState: options.unreadyDeployment ? 'BUILDING' : 'READY',
          meta: { sourceRevision: options.deploymentWrongRevision ? 'b'.repeat(40) : REVISION },
        };
      },
      snapshot: async (project, keys) =>
        Object.fromEntries(
          keys.map((key) => [
            key,
            Object.hasOwn(project === 'api-private' ? api : web, key)
              ? { value: (project === 'api-private' ? api : web)[key] }
              : null,
          ]),
        ),
    },
    ci: async () => {
      ciCalls++;
      if (options.ciFailure) throw new Error(SECRET);
      return { revision: options.ciWrongRevision ? 'b'.repeat(40) : REVISION, runId: 1 };
    },
    health: async (_url, expected) => {
      healthCalls++;
      return {
        ...expected,
        revision: options.healthWrongRevision ? 'b'.repeat(40) : expected.revision,
      };
    },
    clientFactory: (configuration) => {
      factoryOptions.push(configuration);
      return {
        connect: async () => {},
        end: async () => {
          clientsClosed++;
        },
        on: () => {},
      };
    },
    snapshot: async () => {
      snapshots++;
      return clone(state);
    },
    fetcher: async (target, init) => {
      const url = new URL(target),
        path = url.pathname;
      assert.equal(url.origin, API_ORIGIN);
      assert.equal(init.redirect, 'error');
      assert.equal(init.headers['x-user-id'], SUBJECT);
      assert.equal(init.headers['x-admin-recipe-auth-mode'], AUTH_MODE);
      assert.equal(decodeURIComponent(init.headers['x-user-name-encoded']), NAME);
      calls.push({ method: init.method, path, key: init.headers['idempotency-key'] });
      if (init.method === 'GET' && path === '/billing/status')
        return response({ remaining: state.available });
      if (init.method === 'POST' && path.endsWith('/generate')) {
        const kind = path === '/workouts/generate' ? 'workout' : 'program',
          cost = kind === 'workout' ? 1 : 2,
          id = kind === 'workout' ? WORKOUT : PROGRAM;
        const known = state.operations.find((op) => op.id === LEGACY);
        if (known.reserved === 1000) {
          known.reserved = 100;
          state.daily.forEach((row) => {
            row.reserved -= 900;
          });
        }
        const failed = options.failWorkout && kind === 'workout',
          running = options.uncertainWorkout && kind === 'workout';
        const op = {
          id,
          key: init.headers['idempotency-key'],
          kind,
          status: running ? 'running' : failed ? 'failed' : 'succeeded',
          resource: id,
          attempts: kind === 'workout' ? 1 : 2,
          reserved: running ? 300 : 15 * cost,
          input: running ? 0 : 10 * cost,
          output: running ? 0 : 5 * cost,
          day: DAY,
          expired: false,
          events: running ? 0 : cost,
          legacy_receipts: 0,
          receipts: running ? 0 : cost,
          measured_input: running ? 0 : 10 * cost,
          measured_output: running ? 0 : 5 * cost,
          measured_total: running ? 0 : 15 * cost,
          planning_version: '2',
          resource_exists: !failed && !running,
        };
        state.operations.push(op);
        if (options.concurrentGeneration)
          state.operations.push({
            ...op,
            id: '66666666-6666-4666-8666-666666666666',
            key: 'unrelated-concurrent-key',
          });
        state.daily.forEach((row) => {
          for (const key of ['attempts', 'reserved', 'input', 'output']) row[key] += op[key];
        });
        state.reservations.push({
          id: `recipe-reservation-${kind}`,
          state: running ? 'pending' : failed ? 'released' : 'committed',
          amount: cost,
        });
        if (!failed) state.available -= cost;
        if (running) throw new Error(SECRET);
        if (failed) return response({ error: SECRET }, 503);
        privateBodies.set(id, kind === 'workout' ? workout : { id: PROGRAM, data: programData });
        if (options.timeoutCommittedWorkout && kind === 'workout') throw new Error(SECRET);
        if (options.invalidWorkout && kind === 'workout')
          workout.exercises[0].prescription.work_seconds = 999999;
        if (kind === 'workout')
          return response(
            { ...workout, ...(options.foreignResponseId ? { id: UNKNOWN } : {}) },
            201,
          );
        return response(
          { id: PROGRAM, weeksCount: 2, sessionsPerWeek: 2, sessionDurationMinutes: 20 },
          201,
        );
      }
      if (init.method === 'POST' && path === `/admin/members/${OWNER}/credits`) {
        const body = JSON.parse(init.body);
        refundRequests.push(body);
        if (options.refundUnknown) throw new Error(SECRET);
        if (state.refund.length === 0) {
          state.available += body.amount;
          state.refund.push({ amount: body.amount });
        }
        if (options.refundTimeout) throw new Error(SECRET);
        return response({ ok: true });
      }
      const id = path.split('/').at(-1);
      if (init.method === 'DELETE') {
        assert.ok([WORKOUT, PROGRAM].includes(id));
        assert.ok(privateBodies.has(id));
        deleted.push(id);
        privateBodies.delete(id);
        state.operations.find((op) => op.resource === id).resource_exists = false;
        if (options.deleteTimeout) throw new Error(SECRET);
        return response({ ok: true });
      }
      if (init.method === 'GET' && ['workouts', 'programs'].includes(path.split('/')[1])) {
        if (!privateBodies.has(id)) return response({ error: 'NOT_FOUND' }, 404);
        const body = clone(privateBodies.get(id));
        if (path.startsWith('/workouts/')) delete body.planning_version;
        return response(body);
      }
      throw new Error('Unexpected private route ' + SECRET);
    },
  };
  return {
    env,
    dependencies,
    state,
    calls,
    reports,
    refundRequests,
    deleted,
    factoryOptions,
    stats: () => ({ clientsClosed, ciCalls, healthCalls, snapshots }),
    run: () => qualifyProductionAdmin(env, dependencies),
  };
}

test('inactive by default: no provider, database, evidence or generation calls', async () => {
  const f = fixture({ env: { ADMIN_RECIPE_CONFIRM: '' } }),
    report = await f.run();
  assert.equal(report.active, false);
  assert.equal(f.calls.length, 0);
  assert.equal(f.reports.length, 0);
  assert.deepEqual(f.stats(), { clientsClosed: 0, ciCalls: 0, healthCalls: 0, snapshots: 0 });
});
for (const [name, options] of [
  ['wrong exact confirmation', { env: { ADMIN_RECIPE_CONFIRM: 'yes' } }],
  ['non-owner', { nonOwner: true }],
  ['API mode', { api: { PRODUCTION_ACCESS_MODE: 'public' } }],
  ['Web mode', { web: { PRODUCTION_ACCESS_MODE: 'public' } }],
  ['configuration SHA', { api: { APP_REVISION: 'b'.repeat(40) } }],
  ['served SHA', { healthWrongRevision: true }],
  ['CI SHA', { ciWrongRevision: true }],
  ['CI failure', { ciFailure: true }],
  ['service secret mismatch', { web: { SERVICE_SECRET: 'Z9y8X7w6V5u4T3s2R1q0P9o8N7m6L5k4' } }],
  ['canonical API', { web: { API_URL: 'https://other.invalid' } }],
  ['changed daily budget', { api: { AI_USER_DAILY_TOKENS: '999999' } }],
  ['evidence path escape', { env: { ADMIN_RECIPE_EVIDENCE_FILE: '/other/report.json' } }],
])
  test(`fails closed before business requests: ${name}`, async () => {
    const f = fixture(options),
      report = await f.run();
    assert.equal(report.complete, false);
    assert.equal(f.calls.length, 0);
    assert.equal(f.refundRequests.length, 0);
    assert.equal(report.googleFreshLoginTested, false);
  });

test('exactly two generation POSTs, v2/timing/persistence, exact-ID cleanup and exact virtual-credit restitution', async () => {
  const f = fixture(),
    report = await f.run();
  assert.equal(report.complete, true, JSON.stringify(report.failure));
  assert.deepEqual(report.generationPosts, { workout: 1, program: 1 });
  assert.deepEqual(report.credits, { initial: 5, committed: 3, restored: 3 });
  assert.deepEqual(f.deleted, [WORKOUT, PROGRAM]);
  assert.equal(report.cleanup.verified404, 2);
  assert.equal(report.cleanup.manualCleanupRequired, false);
  assert.equal(f.refundRequests.length, 1);
  assert.equal(f.refundRequests[0].amount, 3);
  assert.equal(f.refundRequests[0].requestId, recipeKeys(f.env).refund);
  assert.equal(report.accounting.legacyReleasedTokens, 900);
  assert.equal(report.accounting.unknownLegacyOperationsPreserved, 1);
  assert.equal(f.state.operations.find((op) => op.id === UNKNOWN).reserved, 4444);
  assert.equal(report.accounting.measuredTokens, 45);
  assert.equal(f.stats().clientsClosed, 1);
  assert.match(f.factoryOptions[0].options, /default_transaction_read_only=on/);
  assert.equal(report.authMode, AUTH_MODE);
  assert.equal(report.googleFreshLoginTested, false);
  assert.equal(report.browserInteractionTested, false);
  const publicEvidence = JSON.stringify(f.reports);
  for (const secret of [
    OWNER,
    WORKOUT,
    PROGRAM,
    LEGACY,
    UNKNOWN,
    SUBJECT,
    SECRET,
    NAME,
    DB,
    'private_password',
    'Sortie privée',
    'Programme privé',
    'owner@private.invalid',
  ])
    assert.ok(!publicEvidence.includes(secret));
});

test('a failed first generation stops the programme and does not grant credits that were never debited', async () => {
  const f = fixture({ failWorkout: true }),
    report = await f.run();
  assert.equal(report.complete, false);
  assert.deepEqual(report.generationPosts, { workout: 1, program: 0 });
  assert.equal(f.refundRequests.length, 0);
  assert.equal(f.deleted.length, 0);
  assert.equal(report.cleanup.manualCleanupRequired, false);
  assert.equal(f.state.available, 5);
});
test('an uncertain running outcome is never retried, deleted or blindly refunded', async () => {
  const f = fixture({ uncertainWorkout: true }),
    report = await f.run();
  assert.equal(report.complete, false);
  assert.deepEqual(report.generationPosts, { workout: 1, program: 0 });
  assert.equal(f.deleted.length, 0);
  assert.equal(f.refundRequests.length, 0);
  assert.equal(report.cleanup.manualCleanupRequired, true);
});
test('a timed-out POST with a proved committed operation cleans only its exact resource and restores only its one credit', async () => {
  const f = fixture({ timeoutCommittedWorkout: true }),
    report = await f.run();
  assert.equal(report.complete, false);
  assert.deepEqual(report.generationPosts, { workout: 1, program: 0 });
  assert.deepEqual(f.deleted, [WORKOUT]);
  assert.equal(f.refundRequests.length, 1);
  assert.equal(f.refundRequests[0].amount, 1);
  assert.equal(report.cleanup.manualCleanupRequired, false);
});
test('a response containing an unrelated ID cannot redirect cleanup away from the recipe operation', async () => {
  const f = fixture({ foreignResponseId: true }),
    report = await f.run();
  assert.equal(report.complete, false);
  assert.deepEqual(f.deleted, [WORKOUT]);
  assert.ok(!f.calls.some((call) => call.path.endsWith(UNKNOWN)));
  assert.equal(f.refundRequests[0].amount, 1);
});
test('invalid v2 prescriptions fail qualification and stop before programme generation', async () => {
  const f = fixture({ invalidWorkout: true }),
    report = await f.run();
  assert.equal(report.complete, false);
  assert.equal(report.failure.code, 'v2_contract_invalid');
  assert.equal(report.checks.v2PrescriptionsTimingAndPersistence, false);
  assert.equal(report.generationPosts.program, 0);
  assert.deepEqual(f.deleted, [WORKOUT]);
});
test('DELETE timeout is resolved by a 404, with no second DELETE', async () => {
  const f = fixture({ deleteTimeout: true }),
    report = await f.run();
  assert.equal(report.complete, true);
  assert.deepEqual(f.deleted, [WORKOUT, PROGRAM]);
  assert.equal(f.calls.filter((call) => call.method === 'DELETE').length, 2);
});
test('refund timeout is resolved only by its exact idempotent audit receipt, never another POST', async () => {
  const f = fixture({ refundTimeout: true }),
    report = await f.run();
  assert.equal(report.complete, true);
  assert.equal(f.refundRequests.length, 1);
  assert.equal(report.credits.restored, 3);
});
test('unproved refund outcome stops with manual cleanup instead of a duplicate grant', async () => {
  const f = fixture({ refundUnknown: true }),
    report = await f.run();
  assert.equal(report.complete, false);
  assert.equal(report.cleanup.manualCleanupRequired, true);
  assert.equal(f.refundRequests.length, 1);
  assert.equal(report.credits.restored, 0);
});
test('GitHub rerun attempt 2 keeps generation/refund keys and refuses to pay or refund twice', async () => {
  const f = fixture();
  assert.equal((await f.run()).complete, true);
  const count = f.calls.filter((call) => call.path.endsWith('/generate')).length;
  const originalKeys = recipeKeys(f.env),
    businessCalls = f.calls.length;
  f.env.GITHUB_RUN_ATTEMPT = '2';
  assert.deepEqual(recipeKeys(f.env), originalKeys);
  const again = await f.run();
  assert.equal(again.runAttempt, 2);
  assert.equal(f.calls.length, businessCalls);
  assert.equal(again.complete, false);
  assert.equal(again.failure.code, 'recipe_or_generation_already_started');
  assert.equal(f.refundRequests.length, 1);
  assert.equal(f.calls.filter((call) => call.path.endsWith('/generate')).length, count);
});

test('SQL adapter is read-only, selects only the existing OAuth subject, verifies exact lineage and rolls back its snapshot', async () => {
  const f = fixture(),
    queries = [],
    configuration = { ownerId: OWNER, email: f.env.BOOTSTRAP_ADMIN_EMAIL, database: DB },
    keys = recipeKeys(f.env);
  const client = {
    query: async (text) => {
      queries.push(text);
      assert.match(
        text.trim(),
        /^(select|begin isolation level repeatable read read only|rollback)/i,
      );
      assert.doesNotMatch(text, /access_token|refresh_token|id_token|password_hash/i);
      if (text.startsWith('select current_database'))
        return { rows: [{ database: 'alcide_recipe_test', day: DAY }] };
      if (text.includes('from public.users'))
        return {
          rows: [{ id: OWNER, email: f.env.BOOTSTRAP_ADMIN_EMAIL, name: NAME, suspended_at: null }],
        };
      if (text.includes('count(*)::integer as total from public.accounts'))
        return { rows: [{ total: 1 }] };
      if (text.startsWith('select provider_account_id'))
        return { rows: [{ provider_account_id: SUBJECT }] };
      if (text.includes(' as total'))
        return { rows: [{ total: text.includes('billing_credit_grants') ? 5 : 0 }] };
      return { rows: [] };
    },
  };
  const snapshot = await readRecipeSnapshot(client, configuration, keys, async () => ({
    compatible: true,
    appliedMigrations: 14,
    pendingMigrations: 0,
  }));
  assert.equal(snapshot.owner.subject, SUBJECT);
  assert.equal(queries.at(-1), 'rollback');
  await assert.rejects(
    readRecipeSnapshot(client, configuration, keys, async () => ({
      compatible: true,
      appliedMigrations: 13,
      pendingMigrations: 1,
    })),
    /exact_migration_lineage_required/,
  );
  assert.equal(queries.at(-1), 'rollback');
});

test('insufficient existing virtual credits cause no generation or grant', async () => {
  const f = fixture({ insufficientCredits: true }),
    report = await f.run();
  assert.equal(report.complete, false);
  assert.equal(report.failure.code, 'three_virtual_credits_required');
  assert.deepEqual(report.generationPosts, { workout: 0, program: 0 });
  assert.equal(f.refundRequests.length, 0);
  assert.equal(f.stats().clientsClosed, 1);
});
test('concurrent unrelated generation stops the programme and forbids ambiguous credit restitution', async () => {
  const f = fixture({ concurrentGeneration: true }),
    report = await f.run();
  assert.equal(report.complete, false);
  assert.equal(report.generationPosts.program, 0);
  assert.deepEqual(f.deleted, [WORKOUT]);
  assert.equal(f.refundRequests.length, 0);
  assert.equal(report.cleanup.manualCleanupRequired, true);
});
for (const scenario of ['database', 'owner', 'suspension', 'accounts', 'foreign'])
  test(`read-only identity guard rejects ${scenario}`, async () => {
    const f = fixture(),
      configuration = { ownerId: OWNER, email: f.env.BOOTSTRAP_ADMIN_EMAIL, database: DB };
    let rolledBack = false;
    const client = {
      query: async (text) => {
        assert.match(
          text.trim(),
          /^(select|begin isolation level repeatable read read only|rollback)/i,
        );
        if (text === 'rollback') {
          rolledBack = true;
          return { rows: [] };
        }
        if (text.startsWith('select current_database'))
          return {
            rows: [
              {
                database: scenario === 'database' ? 'wrong_database' : 'alcide_recipe_test',
                day: DAY,
              },
            ],
          };
        if (text.includes('from public.users'))
          return {
            rows: [
              {
                id: scenario === 'owner' ? UNKNOWN : OWNER,
                email: f.env.BOOTSTRAP_ADMIN_EMAIL,
                name: NAME,
                suspended_at: scenario === 'suspension' ? new Date() : null,
              },
            ],
          };
        if (text.includes('count(*)::integer as total from public.accounts'))
          return { rows: [{ total: scenario === 'accounts' ? 2 : 1 }] };
        if (text.startsWith('select provider_account_id'))
          return { rows: [{ provider_account_id: SUBJECT }] };
        if (text.includes(' as total'))
          return { rows: [{ total: scenario === 'foreign' ? 1 : 0 }] };
        return { rows: [] };
      },
    };
    await assert.rejects(
      readRecipeSnapshot(client, configuration, recipeKeys(f.env), async () => ({
        compatible: true,
        appliedMigrations: 14,
        pendingMigrations: 0,
      })),
    );
    assert.equal(rolledBack, true);
  });

for (const [name, options] of [
  ['foreign canonical alias', { foreignAlias: true }],
  ['foreign deployment project', { foreignProject: true }],
  ['invalid deployment ID', { badDeploymentId: true }],
  ['mismatched deployment ID', { mismatchedDeployment: true }],
  ['mismatched deployment URL', { mismatchedDeploymentUrl: true }],
  ['unready deployment', { unreadyDeployment: true }],
  ['wrong deployment source SHA', { deploymentWrongRevision: true }],
  ['alias moved after pinning before initial business request', { moveBeforeBusiness: true }],
])
  test(`pinned alias proof fails closed without transporting a service secret: ${name}`, async () => {
    const f = fixture(options),
      report = await f.run();
    assert.equal(report.complete, false);
    assert.equal(f.calls.length, 0);
    assert.equal(f.refundRequests.length, 0);
    assert.deepEqual(report.generationPosts, { workout: 0, program: 0 });
  });
test('alias movement after the first generation prevents subsequent privileged transport and programme/refund POSTs', async () => {
  const f = fixture({ moveAfterGeneration: true }),
    report = await f.run();
  assert.equal(report.complete, false);
  assert.deepEqual(report.generationPosts, { workout: 1, program: 0 });
  assert.equal(
    f.calls.filter((call) => call.method === 'POST' && call.path.endsWith('/generate')).length,
    1,
  );
  assert.equal(f.calls.filter((call) => call.method === 'DELETE').length, 0);
  assert.equal(f.refundRequests.length, 0);
  assert.equal(report.cleanup.manualCleanupRequired, true);
});
test('alias movement after verified cleanup prevents restitution from reaching a different deployment', async () => {
  const f = fixture({ moveAfterCleanup: true }),
    report = await f.run();
  assert.equal(report.complete, false);
  assert.deepEqual(f.deleted, [WORKOUT, PROGRAM]);
  assert.equal(f.refundRequests.length, 0);
  assert.equal(report.cleanup.manualCleanupRequired, true);
});
