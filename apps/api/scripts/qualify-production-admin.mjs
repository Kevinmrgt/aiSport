import { createHash, timingSafeEqual } from 'node:crypto';
import { open, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  WorkoutSchema,
  TrainingProgramSchema,
  getSessionTiming,
  getSessionDurationBounds,
} from '@alcide/shared';
import { Client, databaseUrl } from '../../../scripts/db-operations.mjs';
import { inspectDatabaseMigrationLineage } from '../../../scripts/db-migration-lineage.mjs';
import {
  VercelProduction,
  strongSecret,
  directSourceUrl,
  requireSuccessfulCi,
  checkReleaseHealth,
} from '../../../scripts/production-admin-release.mjs';

export const CONFIRMATION = 'one-workout-one-program-existing-admin';
export const AUTH_MODE = 'authorized-service-existing-owner';
export const API_ORIGIN = 'https://ai-sport-api.vercel.app';
export const WEB_ORIGIN = 'https://www.alcideai.fr';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const AI_KEYS = [
  'AI_GENERATION_ENABLED',
  'AI_USER_DAILY_ATTEMPTS',
  'AI_GLOBAL_DAILY_ATTEMPTS',
  'AI_USER_DAILY_TOKENS',
  'AI_GLOBAL_DAILY_TOKENS',
  'AI_USER_CONCURRENCY',
  'AI_GLOBAL_CONCURRENCY',
  'AI_GENERATION_LEASE_SECONDS',
  'AI_RESERVED_INPUT_TOKENS',
  'AI_MAX_COMPLETION_TOKENS',
  'AI_ALLOWED_MODELS',
  'AI_DEFAULT_MODEL',
];
const API_KEYS = [
  'SERVICE_SECRET',
  'PRODUCTION_ACCESS_MODE',
  'ADMIN_EMAILS',
  'BOOTSTRAP_ADMIN_USER_ID',
  'ALCIDE_DATABASE_URL',
  'FRONTEND_URL',
  'APP_REVISION',
  ...AI_KEYS,
];
const WEB_KEYS = [
  'SERVICE_SECRET',
  'PRODUCTION_ACCESS_MODE',
  'ADMIN_EMAILS',
  'APP_REVISION',
  'API_URL',
  'NEXT_PUBLIC_API_URL',
  'AUTH_URL',
  'NEXTAUTH_URL',
];
const REFUND_REASON =
  'Restitution exacte des crédits virtuels consommés par la recette administrative autorisée, après suppression vérifiée de ses seuls objets de test.';
class RecipeFailure extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
const fail = (code, status) => {
  throw new RecipeFailure(code, status);
};
const invariant = (condition, code) => {
  if (!condition) fail(code);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const canonicalJson = (value) => {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalJson(value[key])]),
    );
  return value;
};
// JSONB and shared-schema parsing can reorder object keys. Values and array order stay strict.
const sameJsonContent = (a, b) =>
  JSON.stringify(canonicalJson(a)) === JSON.stringify(canonicalJson(b));
const number = (value) => {
  const parsed = Number(value);
  invariant(Number.isSafeInteger(parsed) && parsed >= 0, 'invalid_accounting_metadata');
  return parsed;
};
const values = (snapshot) =>
  Object.fromEntries(Object.entries(snapshot).map(([key, item]) => [key, item?.value ?? null]));

export function recipeKeys(env) {
  return Object.fromEntries(
    ['workout', 'program', 'refund'].map((kind) => {
      const bytes = createHash('sha256')
        .update(`${env.GITHUB_RUN_ID}:${env.RELEASE_REVISION}:admin-recipe:${kind}`)
        .digest()
        .subarray(0, 16);
      bytes[6] = (bytes[6] & 15) | 64;
      bytes[8] = (bytes[8] & 63) | 128;
      const hex = bytes.toString('hex');
      return [
        kind,
        `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`,
      ];
    }),
  );
}

export function validateRecipeInput(env) {
  invariant(env.ADMIN_RECIPE_CONFIRM === CONFIRMATION, 'explicit_recipe_confirmation_required');
  invariant(
    env.GITHUB_ACTIONS === 'true' &&
      /^\d+$/.test(env.GITHUB_RUN_ID ?? '') &&
      /^[1-9]\d*$/.test(env.GITHUB_RUN_ATTEMPT ?? ''),
    'github_runner_required',
  );
  invariant(/^[a-f0-9]{40}$/.test(env.RELEASE_REVISION ?? ''), 'immutable_revision_required');
  invariant(
    /^[a-z][a-z0-9_]{2,62}$/.test(env.TARGET_DATABASE_NAME ?? ''),
    'explicit_database_required',
  );
  invariant(
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.BOOTSTRAP_ADMIN_EMAIL ?? ''),
    'explicit_existing_admin_required',
  );
  for (const key of [
    'VERCEL_TOKEN',
    'VERCEL_ORG_ID',
    'VERCEL_API_PROJECT_ID',
    'VERCEL_WEB_PROJECT_ID',
    'GITHUB_TOKEN',
    'GITHUB_REPOSITORY',
  ])
    invariant(Boolean(env[key]), 'provider_configuration_required');
  invariant(
    isAbsolute(env.RUNNER_TEMP ?? '') && isAbsolute(env.ADMIN_RECIPE_EVIDENCE_FILE ?? ''),
    'runner_evidence_path_required',
  );
  const path = resolve(env.ADMIN_RECIPE_EVIDENCE_FILE),
    root = resolve(env.RUNNER_TEMP);
  invariant(
    path.startsWith(root + sep) && relative(root, path) !== '',
    'runner_evidence_path_required',
  );
  return path;
}

export async function recipeConfiguration(env, provider) {
  const [apiSnapshot, webSnapshot] = await Promise.all([
    provider.snapshot(env.VERCEL_API_PROJECT_ID, API_KEYS),
    provider.snapshot(env.VERCEL_WEB_PROJECT_ID, WEB_KEYS),
  ]);
  const api = values(apiSnapshot),
    web = values(webSnapshot),
    email = env.BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase();
  for (const project of [api, web]) {
    invariant(project.PRODUCTION_ACCESS_MODE === 'admin-only', 'admin_only_pair_required');
    invariant(
      same(
        (project.ADMIN_EMAILS ?? '')
          .split(',')
          .map((value) => value.trim().toLowerCase())
          .filter(Boolean),
        [email],
      ),
      'unique_admin_allowlist_required',
    );
    invariant(project.APP_REVISION === env.RELEASE_REVISION, 'configuration_revision_mismatch');
  }
  invariant(
    strongSecret(api.SERVICE_SECRET) && strongSecret(web.SERVICE_SECRET),
    'strong_service_secret_required',
  );
  const a = Buffer.from(api.SERVICE_SECRET),
    b = Buffer.from(web.SERVICE_SECRET);
  invariant(a.length === b.length && timingSafeEqual(a, b), 'service_secret_pair_mismatch');
  invariant(env.VERCEL_API_PROJECT_ID !== env.VERCEL_WEB_PROJECT_ID, 'distinct_projects_required');
  invariant(UUID.test(api.BOOTSTRAP_ADMIN_USER_ID ?? ''), 'pinned_existing_owner_required');
  invariant(
    api.FRONTEND_URL === WEB_ORIGIN &&
      web.API_URL === API_ORIGIN &&
      web.NEXT_PUBLIC_API_URL === API_ORIGIN &&
      web.AUTH_URL === WEB_ORIGIN &&
      web.NEXTAUTH_URL === WEB_ORIGIN,
    'canonical_pair_required',
  );
  invariant(
    typeof api.ALCIDE_DATABASE_URL === 'string' && api.ALCIDE_DATABASE_URL.length > 0,
    'application_database_override_required',
  );
  const database = directSourceUrl(api.ALCIDE_DATABASE_URL).value;
  invariant(
    decodeURIComponent(databaseUrl(database).pathname.slice(1)) === env.TARGET_DATABASE_NAME,
    'active_database_name_mismatch',
  );
  invariant(api.AI_GENERATION_ENABLED !== 'false', 'generation_disabled');
  invariant(
    number(api.AI_USER_DAILY_TOKENS ?? 160000) === 160000 &&
      number(api.AI_GLOBAL_DAILY_TOKENS ?? 2000000) === 2000000,
    'daily_token_policy_mismatch',
  );
  return { api, web, email, ownerId: api.BOOTSTRAP_ADMIN_USER_ID, database };
}

async function defaultEvidence(path, root) {
  const actualRoot = await realpath(root),
    parent = await realpath(dirname(path));
  invariant(
    parent === actualRoot || parent.startsWith(actualRoot + sep),
    'runner_evidence_path_required',
  );
  const file = await open(path, 'wx', 0o600);
  return {
    async write(report) {
      const text = JSON.stringify(report, null, 2) + '\n';
      await file.truncate(0);
      await file.write(text, 0, 'utf8');
      await file.sync();
    },
    async close() {
      await file.close();
    },
  };
}

/** Private metadata only. All SQL runs in explicit read-only transactions. */
export async function readRecipeSnapshot(
  client,
  configuration,
  keys,
  lineageInspector = inspectDatabaseMigrationLineage,
) {
  await client.query('begin isolation level repeatable read read only');
  try {
    const identity = (
      await client.query(
        "select current_database() as database, to_char(now() at time zone 'UTC','YYYY-MM-DD') as day",
      )
    ).rows[0];
    invariant(
      identity?.database ===
        decodeURIComponent(databaseUrl(configuration.database).pathname.slice(1)),
      'active_database_name_mismatch',
    );
    const lineage = await lineageInspector(client);
    invariant(
      lineage.compatible === true &&
        lineage.appliedMigrations === 14 &&
        lineage.pendingMigrations === 0,
      'exact_migration_lineage_required',
    );
    const owners = (
      await client.query('select id,email,name,suspended_at from public.users limit 2')
    ).rows;
    invariant(
      owners.length === 1 &&
        owners[0].id === configuration.ownerId &&
        owners[0].email?.trim().toLowerCase() === configuration.email &&
        owners[0].suspended_at === null,
      'unique_existing_owner_required',
    );
    const owner = owners[0];
    invariant(
      owner.name === null ||
        (typeof owner.name === 'string' &&
          owner.name.length <= 256 &&
          !/[\x00-\x1f\x7f]/.test(owner.name)),
      'existing_profile_unusable',
    );
    const count = number(
      (await client.query('select count(*)::integer as total from public.accounts')).rows[0]?.total,
    );
    const accounts = (
      await client.query(
        "select provider_account_id from public.accounts where user_id=$1::uuid and provider='google' and type in ('oauth','oidc') limit 2",
        [configuration.ownerId],
      )
    ).rows;
    invariant(
      count === 1 &&
        accounts.length === 1 &&
        typeof accounts[0].provider_account_id === 'string' &&
        accounts[0].provider_account_id.length > 0 &&
        accounts[0].provider_account_id.length <= 255 &&
        !/\s/.test(accounts[0].provider_account_id),
      'one_existing_google_account_required',
    );
    const foreign = number(
      (
        await client.query(
          `select ((select count(*) from public.workouts where user_id<>$1::uuid)+(select count(*) from public.training_programs where user_id<>$1::uuid)+(select count(*) from public.session_logs where user_id<>$1::uuid))::integer as total`,
          [configuration.ownerId],
        )
      ).rows[0]?.total,
    );
    invariant(foreign === 0, 'foreign_owned_data_present');
    const operations = (
      await client.query(
        `select o.id,o.operation_key as key,o.kind,o.status,o.resource_id as resource,o.attempts,o.reserved_tokens as reserved,o.input_tokens as input,o.output_tokens as output,
      to_char(o.created_at at time zone 'UTC','YYYY-MM-DD') as day,o.lease_expires_at<now() as expired,
      (select count(*)::integer from public.generation_usage_events e where e.operation_id=o.id) as events,
      (select count(*)::integer from public.generation_usage_events e where e.operation_id=o.id and e.event_key~'^[a-f0-9]{64}$') as legacy_receipts,
      (select count(*)::integer from public.generation_usage_events e where e.operation_id=o.id and e.event_key~'^receipt:[a-f0-9-]{36}$') as receipts,
      (select coalesce(sum(e.input_tokens),0)::integer from public.generation_usage_events e where e.operation_id=o.id) as measured_input,
      (select coalesce(sum(e.output_tokens),0)::integer from public.generation_usage_events e where e.operation_id=o.id) as measured_output,
      (select coalesce(sum(e.total_tokens),0)::integer from public.generation_usage_events e where e.operation_id=o.id) as measured_total,
      case when o.kind='workout' then exists(select 1 from public.workouts w where w.id=o.resource_id and w.user_id=o.user_id) else exists(select 1 from public.training_programs p where p.id=o.resource_id and p.user_id=o.user_id) end as resource_exists,
      case when o.kind='workout' then (select w.data->>'planning_version' from public.workouts w where w.id=o.resource_id and w.user_id=o.user_id) else (select p.data->>'planning_version' from public.training_programs p where p.id=o.resource_id and p.user_id=o.user_id) end as planning_version
      from public.generation_operations o where o.user_id=$1::uuid order by o.created_at,o.id limit 501`,
        [configuration.ownerId],
      )
    ).rows;
    invariant(operations.length <= 500, 'accounting_inspection_limit');
    const daily = (
      await client.query(
        "select scope,attempts,reserved_tokens as reserved,input_tokens as input,output_tokens as output from public.generation_daily_budgets where day=$1::date and scope in ('global',$2)",
        [identity.day, `user:${configuration.ownerId}`],
      )
    ).rows;
    const reservations = (
      await client.query(
        `select id,state,(select coalesce(sum((a->>'amount')::integer),0)::integer from jsonb_array_elements(allocations) a) as amount from public.billing_credit_reservations where user_id=$1::uuid order by id limit 501`,
        [configuration.ownerId],
      )
    ).rows;
    invariant(reservations.length <= 500, 'accounting_inspection_limit');
    const refund = (
      await client.query(
        "select (changes->>'amount')::integer as amount from public.admin_audit_events where request_key=$1 and user_id=$2::uuid and lower(actor_email)=$3 and action='credits.granted' and reason=$4",
        [
          `admin:${configuration.ownerId}:${keys.refund}`,
          configuration.ownerId,
          configuration.email,
          REFUND_REASON,
        ],
      )
    ).rows;
    const available = number(
      (
        await client.query(
          `select coalesce(sum(g.remaining),0)::integer as total from public.billing_credit_grants g left join public.billing_subscriptions s on s.id=g.subscription_id where g.user_id=$1::uuid and g.starts_at<=now() and (g.expires_at is null or g.expires_at>now()) and (g.subscription_id is null or s.status in ('active','past_due'))`,
          [configuration.ownerId],
        )
      ).rows[0]?.total,
    );
    return {
      day: identity.day,
      owner: {
        id: owner.id,
        email: owner.email,
        name: owner.name,
        subject: accounts[0].provider_account_id,
      },
      operations,
      daily,
      reservations,
      refund,
      available,
    };
  } finally {
    await client.query('rollback');
  }
}

const legacyEligible = (op, day) =>
  op.day === day &&
  ['succeeded', 'failed'].includes(op.status) &&
  op.expired === true &&
  number(op.attempts) > 0 &&
  number(op.events) === number(op.attempts) &&
  number(op.legacy_receipts) === number(op.attempts) &&
  number(op.input) === number(op.measured_input) &&
  number(op.output) === number(op.measured_output) &&
  number(op.measured_total) === number(op.input) + number(op.output) &&
  number(op.reserved) > number(op.measured_total);
export function verifyRecipeLedger(before, after, jobs, ownerId) {
  invariant(before.day === after.day, 'utc_day_changed');
  const keys = new Set(jobs.filter((job) => job.attempted).map((job) => job.key)),
    old = new Map(before.operations.map((op) => [op.id, op]));
  invariant(
    after.operations.every((op) => old.has(op.id) || keys.has(op.key)),
    'concurrent_generation_detected',
  );
  let released = 0,
    settled = 0,
    eligible = 0,
    unknown = 0;
  for (const previous of before.operations) {
    const current = after.operations.find((op) => op.id === previous.id);
    invariant(
      current &&
        same(
          [
            current.key,
            current.kind,
            current.status,
            current.attempts,
            current.input,
            current.output,
            current.events,
            current.measured_total,
          ],
          [
            previous.key,
            previous.kind,
            previous.status,
            previous.attempts,
            previous.input,
            previous.output,
            previous.events,
            previous.measured_total,
          ],
        ),
      'existing_accounting_changed',
    );
    const allowed = legacyEligible(previous, before.day);
    if (allowed) {
      eligible++;
      invariant(
        number(current.reserved) === number(previous.measured_total),
        'legacy_settlement_not_proven',
      );
      released += number(previous.reserved) - number(current.reserved);
      settled++;
    } else {
      invariant(
        number(current.reserved) === number(previous.reserved),
        'unknown_provision_changed',
      );
      if (number(previous.events) < number(previous.attempts)) unknown++;
    }
  }
  const own = after.operations.filter((op) => keys.has(op.key));
  for (const op of own) {
    invariant(
      number(op.events) <= number(op.attempts) &&
        number(op.receipts) === number(op.events) &&
        number(op.input) === number(op.measured_input) &&
        number(op.output) === number(op.measured_output) &&
        number(op.measured_total) === number(op.input) + number(op.output),
      'recipe_receipts_invalid',
    );
    invariant(
      number(op.reserved) >= number(op.measured_total) &&
        (number(op.events) !== number(op.attempts) ||
          number(op.reserved) === number(op.measured_total)),
      'recipe_settlement_invalid',
    );
  }
  const totals = own.reduce(
    (sum, op) => ({
      attempts: sum.attempts + number(op.attempts),
      reserved: sum.reserved + number(op.reserved),
      input: sum.input + number(op.input),
      output: sum.output + number(op.output),
    }),
    { attempts: 0, reserved: 0, input: 0, output: 0 },
  );
  for (const scope of ['global', `user:${ownerId}`]) {
    const prior = before.daily.find((row) => row.scope === scope) ?? {
        attempts: 0,
        reserved: 0,
        input: 0,
        output: 0,
      },
      current = after.daily.find((row) => row.scope === scope) ?? {
        attempts: 0,
        reserved: 0,
        input: 0,
        output: 0,
      };
    invariant(
      number(current.attempts) === number(prior.attempts) + totals.attempts &&
        number(current.reserved) === number(prior.reserved) - released + totals.reserved &&
        number(current.input) === number(prior.input) + totals.input &&
        number(current.output) === number(prior.output) + totals.output,
      'daily_ledger_mismatch',
    );
  }
  return {
    ...totals,
    measuredTokens: totals.input + totals.output,
    legacyEligible: eligible,
    legacySettled: settled,
    legacyReleasedTokens: released,
    unknownLegacyOperationsPreserved: unknown,
  };
}

function validateContent(job, body, operation, posted) {
  invariant(
    body?.id === operation.resource && operation.planning_version === '2',
    'persisted_resource_mismatch',
  );
  const content =
    job.kind === 'workout'
      ? {
          title: body.title,
          sport: body.sport,
          difficulty: body.difficulty,
          duration_minutes: body.durationMinutes,
          planning_version: Number(operation.planning_version),
          exercises: body.exercises,
          warmup: body.warmup,
          cooldown: body.cooldown,
        }
      : body.data;
  const result = (job.kind === 'workout' ? WorkoutSchema : TrainingProgramSchema).safeParse(
    content,
  );
  invariant(
    result.success &&
      result.data.planning_version === 2 &&
      result.data.sport === 'marche' &&
      result.data.difficulty === 'beginner',
    'v2_contract_invalid',
  );
  if (job.kind === 'workout')
    invariant(
      posted?.planning_version === 2 &&
        sameJsonContent(
          [posted.exercises, posted.warmup, posted.cooldown],
          [body.exercises, body.warmup, body.cooldown],
        ) &&
        body.durationMinutes === 15,
      'workout_persistence_invalid',
    );
  else
    invariant(
      result.data.weeks_count === 2 &&
        result.data.sessions_per_week === 2 &&
        result.data.session_duration_minutes === 20,
      'program_shape_invalid',
    );
  const sessions =
    job.kind === 'workout' ? [result.data] : result.data.weeks.flatMap((week) => week.sessions);
  for (const session of sessions) {
    invariant(
      session.planning_version === 2 &&
        session.exercises.every((exercise) => exercise.prescription?.version === 2),
      'prescription_version_invalid',
    );
    const seconds = getSessionTiming(
        session.exercises,
        session.warmup,
        session.cooldown,
      ).plannedSeconds,
      bounds = getSessionDurationBounds(job.kind === 'workout' ? 15 : 20);
    invariant(
      seconds >= bounds.minSeconds && seconds <= bounds.maxSeconds,
      'session_timing_invalid',
    );
  }
  return sessions.length;
}

/** Explicitly a trusted service call against a pre-existing owner, never an OAuth login test. */
export async function qualifyProductionAdmin(env, dependencies = {}) {
  const now = dependencies.now ?? Date.now;
  const report = {
    active: Boolean(env.ADMIN_RECIPE_CONFIRM),
    complete: false,
    startedAt: new Date(now()).toISOString(),
    sourceRevision: /^[a-f0-9]{40}$/.test(env.RELEASE_REVISION ?? '') ? env.RELEASE_REVISION : null,
    authMode: AUTH_MODE,
    googleFreshLoginTested: false,
    browserInteractionTested: false,
    runAttempt: Number.isSafeInteger(Number(env.GITHUB_RUN_ATTEMPT))
      ? Number(env.GITHUB_RUN_ATTEMPT)
      : null,
    checks: {},
    generationPosts: { workout: 0, program: 0 },
    credits: { initial: 0, committed: 0, restored: 0 },
    cleanup: { attempted: 0, deleted: 0, verified404: 0, manualCleanupRequired: false },
    durationsMs: {},
  };
  if (!env.ADMIN_RECIPE_CONFIRM) return report;
  let stage = 'input',
    store,
    client,
    configuration,
    pinnedPair,
    before,
    after,
    headers,
    primaryFailure,
    writeAllowed = false;
  const keys = recipeKeys(env),
    jobs = [
      {
        kind: 'workout',
        path: 'workouts',
        key: keys.workout,
        cost: 1,
        attempted: false,
        validated: false,
        deleted: false,
      },
      {
        kind: 'program',
        path: 'programs',
        key: keys.program,
        cost: 2,
        attempted: false,
        validated: false,
        deleted: false,
      },
    ];
  const fetcher = dependencies.fetcher ?? fetch,
    provider = dependencies.provider ?? new VercelProduction(env, fetcher);
  const inspect = async () => {
    const snapshot = await (dependencies.snapshot ?? readRecipeSnapshot)(
      client,
      configuration,
      keys,
    );
    invariant(!before || same(snapshot.owner, before.owner), 'existing_identity_changed');
    return snapshot;
  };
  const aliasPair = async () =>
    Promise.all(
      [
        ['api', env.VERCEL_API_PROJECT_ID, API_ORIGIN],
        ['web', env.VERCEL_WEB_PROJECT_ID, WEB_ORIGIN],
      ].map(async ([component, project, origin]) => {
        const assignment = await provider.aliasDeployment(project);
        invariant(
          assignment?.component === component &&
            assignment.alias === new URL(origin).hostname &&
            /^dpl_[a-zA-Z0-9]+$/.test(assignment.deploymentId ?? '') &&
            /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(assignment.url ?? ''),
          'alias_assignment_unverified',
        );
        const deployment = await provider.request(
          `/v13/deployments/${encodeURIComponent(assignment.deploymentId)}`,
        );
        invariant(
          deployment?.projectId === project &&
            deployment.id === assignment.deploymentId &&
            deployment.url === assignment.url.slice(8) &&
            deployment.readyState === 'READY' &&
            deployment.meta?.sourceRevision === env.RELEASE_REVISION,
          'alias_deployment_unverified',
        );
        return {
          component,
          project,
          alias: assignment.alias,
          deploymentId: assignment.deploymentId,
          url: assignment.url,
          revision: deployment.meta.sourceRevision,
        };
      }),
    );
  const verifyPinnedPair = async () => {
    const current = await aliasPair();
    invariant(pinnedPair && same(current, pinnedPair), 'pinned_alias_assignment_changed');
  };
  const health = async () => {
    await verifyPinnedPair();
    for (let pass = 0; pass < 2; pass++)
      for (const [origin, path, service, status] of [
        [API_ORIGIN, '/health/ready', 'alcide-api', 'ready'],
        [WEB_ORIGIN, '/api/health', 'alcide-web', 'ok'],
      ]) {
        const result = await (dependencies.health ?? checkReleaseHealth)(
          origin + path,
          { service, status, revision: env.RELEASE_REVISION },
          { fetcher },
        );
        invariant(result?.revision === env.RELEASE_REVISION, 'stable_revision_pair_required');
      }
  };
  const request = async (method, path, body, key) => {
    await verifyPinnedPair();
    const started = now();
    let response;
    try {
      response = await fetcher(API_ORIGIN + path, {
        method,
        redirect: 'error',
        signal: AbortSignal.timeout(
          method === 'POST' && path.endsWith('/generate') ? 75_000 : 20_000,
        ),
        headers: {
          ...headers,
          ...(key ? { 'idempotency-key': key } : {}),
          'x-auth-issued-at': String(now()),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      fail('service_request_outcome_uncertain');
    } finally {
      report.durationsMs[stage] = Math.max(0, now() - started);
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      fail('service_http_failure', response.status);
    }
    if (method === 'POST' && path.endsWith('/generate'))
      invariant(response.status === 201, 'generation_created_status_required');
    try {
      return await response.json();
    } catch {
      fail('service_json_invalid', response.status);
    }
  };
  const closeSnapshot = async () => {
    after = await inspect();
    return after;
  };
  try {
    const path = validateRecipeInput(env);
    store = await (dependencies.evidence ?? defaultEvidence)(path, env.RUNNER_TEMP);
    await store.write(report);
    stage = 'ci';
    const ci = await (dependencies.ci ?? requireSuccessfulCi)(env, fetcher);
    invariant(ci?.revision === env.RELEASE_REVISION, 'successful_ci_for_exact_revision_required');
    report.checks.exactSuccessfulCi = true;
    stage = 'configuration';
    configuration = await recipeConfiguration(env, provider);
    report.checks.closedCanonicalPair = true;
    stage = 'alias_ownership';
    pinnedPair = await aliasPair();
    report.checks.pinnedAliasOwnership = true;
    stage = 'health';
    await health();
    report.checks.stableRevisionPair = true;
    stage = 'database';
    client = (dependencies.clientFactory ?? ((options) => new Client(options)))({
      connectionString: configuration.database,
      connectionTimeoutMillis: 15_000,
      statement_timeout: 10_000,
      query_timeout: 15_000,
      options: '-c default_transaction_read_only=on',
    });
    client.on?.('error', () => {});
    await client.connect();
    const identity = await inspect();
    invariant(identity.owner.id === configuration.ownerId, 'unique_existing_owner_required');
    before = identity;
    invariant(
      !before.operations.some(
        (op) => op.status === 'running' || jobs.some((job) => job.key === op.key),
      ),
      'recipe_or_generation_already_started',
    );
    invariant(before.refund.length === 0, 'recipe_already_refunded');
    report.checks.existingOwnerAndGoogleIdentity = true;
    report.checks.readOnlyDatabaseAnd14Migrations = true;
    headers = {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'x-internal-secret': configuration.api.SERVICE_SECRET,
      'x-user-id': identity.owner.subject,
      'x-user-email': identity.owner.email ?? configuration.email,
      'x-email-verified': 'true',
      'x-auth-method': 'standard',
      'x-admin-recipe-auth-mode': AUTH_MODE,
      ...(identity.owner.name === null
        ? {}
        : identity.owner.name === ''
          ? { 'x-user-name': '' }
          : { 'x-user-name-encoded': encodeURIComponent(identity.owner.name) }),
    };
    stage = 'initial_credits';
    const billing = await request('GET', '/billing/status');
    invariant(
      Number.isSafeInteger(billing.remaining) && billing.remaining >= 3,
      'three_virtual_credits_required',
    );
    before = await inspect();
    invariant(
      billing.remaining === before.available &&
        !before.reservations.some((item) => item.state === 'pending'),
      'initial_credit_state_uncertain',
    );
    report.credits.initial = billing.remaining;
    writeAllowed = true;
    for (const job of jobs) {
      stage = `${job.kind}_configuration`;
      const currentConfiguration = await recipeConfiguration(env, provider);
      invariant(same(configuration, currentConfiguration), 'production_configuration_changed');
      stage = `${job.kind}_health`;
      await health();
      stage = `${job.kind}_generation`;
      job.attempted = true;
      report.generationPosts[job.kind]++;
      const input =
        job.kind === 'workout'
          ? {
              sport: 'marche',
              level: 'beginner',
              duration_minutes: 15,
              goals: 'Entretenir une endurance générale à allure confortable.',
            }
          : {
              sport: 'marche',
              level: 'beginner',
              weeks_count: 2,
              sessions_per_week: 2,
              session_duration_minutes: 20,
              goals: 'Entretenir une endurance générale avec une progression douce.',
            };
      const posted = await request('POST', `/${job.path}/generate`, input, job.key);
      stage = `${job.kind}_persistence`;
      await closeSnapshot();
      verifyRecipeLedger(before, after, jobs, configuration.ownerId);
      const op = after.operations.find((item) => item.key === job.key && item.kind === job.kind);
      invariant(
        op?.status === 'succeeded' && UUID.test(op.resource) && posted.id === op.resource,
        'committed_operation_required',
      );
      job.resource = op.resource;
      const persisted = await request('GET', `/${job.path}/${job.resource}`);
      job.sessions = validateContent(job, persisted, op, posted);
      job.validated = true;
    }
  } catch (error) {
    primaryFailure = {
      stage,
      code: error instanceof RecipeFailure ? error.code : 'private_failure',
      ...(Number.isInteger(error?.status) && error.status >= 100 && error.status <= 599
        ? { httpStatus: error.status }
        : {}),
    };
  } finally {
    if (writeAllowed) {
      try {
        stage = 'outcome_inspection';
        await closeSnapshot();
        const cleanupConfiguration = await recipeConfiguration(env, provider);
        invariant(same(configuration, cleanupConfiguration), 'production_configuration_changed');
        await health();
        for (const job of jobs.filter((item) => item.attempted)) {
          const op = after.operations.find(
            (item) => item.key === job.key && item.kind === job.kind,
          );
          if (!op || op.status === 'running') {
            report.cleanup.manualCleanupRequired = true;
            continue;
          }
          if (op.status !== 'succeeded') continue;
          invariant(UUID.test(op.resource), 'committed_operation_required');
          job.resource = op.resource;
          stage = `${job.kind}_cleanup`;
          report.cleanup.attempted++;
          // This path is derived only from the exact owner+operation key inspected above.
          try {
            if (op.resource_exists === true)
              await request('DELETE', `/${job.path}/${job.resource}`);
          } catch {
            /* A subsequent 404 is required even if DELETE's outcome is uncertain. */
          }
          try {
            await request('GET', `/${job.path}/${job.resource}`);
            report.cleanup.manualCleanupRequired = true;
          } catch (error) {
            if (error instanceof RecipeFailure && error.status === 404) {
              job.deleted = true;
              report.cleanup.deleted++;
              report.cleanup.verified404++;
            } else report.cleanup.manualCleanupRequired = true;
          }
        }
        stage = 'accounting';
        await closeSnapshot();
        report.accounting = verifyRecipeLedger(before, after, jobs, configuration.ownerId);
        report.checks.accountingAndUnknownProvisions = true;
        const own = after.operations.filter((op) =>
          jobs.some((job) => job.attempted && job.key === op.key),
        );
        const committed = jobs.reduce(
          (sum, job) =>
            sum +
            (own.some((op) => op.key === job.key && op.status === 'succeeded') ? job.cost : 0),
          0,
        );
        const oldReservations = new Map(before.reservations.map((item) => [item.id, item]));
        invariant(
          before.reservations.every((item) =>
            same(
              item,
              after.reservations.find((current) => current.id === item.id),
            ),
          ),
          'existing_credit_reservation_changed',
        );
        const added = after.reservations.filter((item) => !oldReservations.has(item.id));
        invariant(
          added.every((item) => ['committed', 'released'].includes(item.state)) &&
            added
              .filter((item) => item.state === 'committed')
              .reduce((sum, item) => sum + number(item.amount), 0) === committed,
          'recipe_credit_cost_uncertain',
        );
        report.credits.committed = committed;
        invariant(
          after.available === report.credits.initial - committed,
          'virtual_credit_delta_mismatch',
        );
        invariant(
          !report.cleanup.manualCleanupRequired &&
            jobs
              .filter((job) => own.some((op) => op.key === job.key && op.status === 'succeeded'))
              .every((job) => job.deleted),
          'cleanup_unproven',
        );
        if (committed > 0) {
          stage = 'credit_restitution';
          try {
            await request('POST', `/admin/members/${configuration.ownerId}/credits`, {
              amount: committed,
              reason: REFUND_REASON,
              requestId: keys.refund,
            });
          } catch {
            /* Never repeat this POST. Inspect the idempotent audit receipt instead. */
          }
          await closeSnapshot();
          invariant(
            after.refund.length === 1 &&
              number(after.refund[0].amount) === committed &&
              after.available === report.credits.initial,
            'credit_restitution_unproven',
          );
          report.credits.restored = committed;
        }
        stage = 'final_configuration';
        const final = await recipeConfiguration(env, provider);
        invariant(same(configuration, final), 'production_configuration_changed');
        await health();
        report.checks.configurationAndCapsUnchanged = true;
        if (!primaryFailure)
          invariant(
            jobs.every((job) => job.attempted && job.validated && job.deleted),
            'recipe_not_completed',
          );
        report.checks.v2PrescriptionsTimingAndPersistence = jobs.every(
          (job) => job.validated && job.deleted,
        );
      } catch (error) {
        report.cleanup.manualCleanupRequired = true;
        primaryFailure ??= {
          stage,
          code: error instanceof RecipeFailure ? error.code : 'private_failure',
          ...(Number.isInteger(error?.status) && error.status >= 100 && error.status <= 599
            ? { httpStatus: error.status }
            : {}),
        };
      }
    }
    if (client)
      await client.end().catch(() => {
        report.cleanup.manualCleanupRequired = true;
        primaryFailure ??= { stage: 'close', code: 'database_close_failed' };
      });
    report.complete =
      !primaryFailure &&
      jobs.every((job) => job.validated && job.deleted) &&
      report.credits.restored === report.credits.committed;
    if (primaryFailure) report.failure = primaryFailure;
    report.completedAt = new Date(now()).toISOString();
    report.durationsMs.total = Math.max(
      0,
      Date.parse(report.completedAt) - Date.parse(report.startedAt),
    );
    if (store) {
      try {
        await store.write(report);
      } finally {
        await store.close();
      }
    }
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  qualifyProductionAdmin(process.env)
    .then((report) => {
      console.log(JSON.stringify(report));
      process.exitCode = report.active && !report.complete ? 1 : 0;
    })
    .catch(() => {
      console.error(
        JSON.stringify({
          complete: false,
          authMode: AUTH_MODE,
          googleFreshLoginTested: false,
          browserInteractionTested: false,
          failure: { code: 'private_failure' },
        }),
      );
      process.exitCode = 1;
    });
}
