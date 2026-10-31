import { createHash } from 'node:crypto';
import { resolveDatabaseUrl } from '../db/database-url.js';

export interface ReadinessResult {
  ready: boolean;
  checks: {
    database: 'ok' | 'unavailable';
    schema: 'ok' | 'missing';
    aiConfiguration: 'ok' | 'missing';
  };
}

type DatabaseChecks = Pick<ReadinessResult['checks'], 'database' | 'schema'>;

// Kept in sync with the committed journal by readiness.test.ts. No runtime file I/O
// is needed in Vercel's serverless bundle.
export const READINESS_MIGRATION_TIMESTAMP = 1793453127096;
export const READINESS_MIGRATION_COUNT = 16;

const REQUIRED_TABLES = [
  'public.incidents',
  'public.users',
  'public.accounts',
  'public.sessions',
  'public.workouts',
  'public.training_programs',
  'public.session_logs',
  'public.user_settings',
  'public.generation_quotas',
  'public.generation_control',
  'public.generation_operations',
  'public.generation_daily_budgets',
  'public.generation_usage_events',
  'public.pilot_control',
  'public.pilot_invitations',
  'public.pilot_admissions',
  'public.pilot_attempts',
  'public.account_revocations',
  'public.session_log_operations',
  'public.admin_audit_events',
  'public.admin_tracking',
  'public.beta_credit_adjustments',
  'public.beta_testers',
  'public.billing_accounts',
  'public.billing_credit_grants',
  'public.billing_credit_reservations',
  'public.billing_subscriptions',
  'public.billing_webhook_events',
  'public.page_visits',
  'public.platform_settings',
  'drizzle.__drizzle_migrations',
];

// A single physical database probe per process, including its connection cleanup.
// Completed results are not cached: a failed probe must recover on the next call.
let databaseProbe: Promise<DatabaseChecks> | undefined;

function booleanDiagnostic(value: unknown) {
  return {
    type: typeof value,
    value: typeof value === 'boolean' ? value : null,
    isTrue: value === true,
  };
}

function metadataInteger(value: unknown): number | null {
  if ((typeof value !== 'string' || !/^\d{1,16}$/.test(value)) && typeof value !== 'number')
    return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

/** Private console evidence only. Never add these fields to the public health response. */
async function logMissingSchema(
  client: {
    query: (query: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
  },
  schemaReady: unknown,
  migrationsReady: unknown,
  configuredDatabaseUrl: string,
): Promise<void> {
  const diagnostic: {
    event: string;
    schemaReady: ReturnType<typeof booleanDiagnostic>;
    migrationsReady: ReturnType<typeof booleanDiagnostic>;
    complete: boolean;
    databaseNameSha256: string | null;
    configuredDatabaseNameSha256: string | null;
    databaseNameMatchesConfigured: boolean | null;
    missingTables: string[];
    migrationTablePresent: boolean | null;
    migrationCount: number | null;
    latestMigrationTimestamp: number | null;
  } = {
    event: 'readiness_schema_missing',
    schemaReady: booleanDiagnostic(schemaReady),
    migrationsReady: booleanDiagnostic(migrationsReady),
    complete: false,
    databaseNameSha256: null,
    configuredDatabaseNameSha256: null,
    databaseNameMatchesConfigured: null,
    missingTables: [],
    migrationTablePresent: null,
    migrationCount: null,
    latestMigrationTimestamp: null,
  };
  try {
    const configuredPath = new URL(configuredDatabaseUrl).pathname.slice(1);
    const configuredName = configuredPath ? decodeURIComponent(configuredPath) : null;
    if (configuredName)
      diagnostic.configuredDatabaseNameSha256 = createHash('sha256')
        .update(configuredName)
        .digest('hex');
    const identity = await client.query('select current_database() as database_name');
    const name = identity.rows[0]?.['database_name'];
    if (typeof name !== 'string' || !name.length) throw new Error('ReadinessDiagnosticUnavailable');
    diagnostic.databaseNameSha256 = createHash('sha256').update(name).digest('hex');
    diagnostic.databaseNameMatchesConfigured =
      configuredName === null ? null : configuredName === name;
    // WHERE evaluates table existence in PostgreSQL, independently of JS boolean parsers.
    const missing = await client.query(
      `select table_name from unnest($1::text[]) as required(table_name)
       where to_regclass(table_name) is null order by table_name`,
      [REQUIRED_TABLES],
    );
    if (missing.rows.some((row) => !REQUIRED_TABLES.includes(String(row['table_name']))))
      throw new Error('ReadinessDiagnosticUnavailable');
    diagnostic.missingTables = REQUIRED_TABLES.filter((table) =>
      missing.rows.some((row) => row['table_name'] === table),
    );
    diagnostic.migrationTablePresent = !diagnostic.missingTables.includes(
      'drizzle.__drizzle_migrations',
    );
    if (diagnostic.migrationTablePresent) {
      const history = await client.query(`select count(*)::text as migration_count,
        max(created_at)::text as latest_migration_timestamp from drizzle.__drizzle_migrations`);
      diagnostic.migrationCount = metadataInteger(history.rows[0]?.['migration_count']);
      diagnostic.latestMigrationTimestamp = metadataInteger(
        history.rows[0]?.['latest_migration_timestamp'],
      );
    }
    diagnostic.complete = true;
  } catch {
    // Driver errors can contain URLs or SQL values. An incomplete diagnostic never changes readiness.
  }
  console.error('[Readiness] Schema diagnostic', diagnostic);
}

async function inspectDatabase(): Promise<DatabaseChecks> {
  let database: ReadinessResult['checks']['database'] = 'unavailable';
  let schema: ReadinessResult['checks']['schema'] = 'missing';

  try {
    // Import differe : /health reste une sonde de vie sans acces aux dependances.
    const { Client } = await import('pg');
    // A dedicated, bounded connection is closed on every path. The timeout
    // cancels the server statement as well as bounding a lost network response;
    // no Promise.race leaves a background pooled query running after the probe.
    const connectionString = resolveDatabaseUrl();
    const client = new Client({
      connectionString,
      connectionTimeoutMillis: 3_000,
      statement_timeout: 3_000,
      query_timeout: 3_500,
    });
    try {
      await client.connect();
      const result = await client.query<{ schema_ready: boolean }>(
        `select coalesce(bool_and(to_regclass(table_name) is not null), false) as schema_ready
         from unnest($1::text[]) as required(table_name)`,
        [REQUIRED_TABLES],
      );
      let migrationsReady: unknown;
      if (result.rows[0]?.schema_ready === true) {
        const migrations = await client.query<{ migrations_ready: boolean }>(
          `select coalesce(max(created_at) >= $1, false) and count(*) >= $2 as migrations_ready
           from drizzle.__drizzle_migrations`,
          [READINESS_MIGRATION_TIMESTAMP, READINESS_MIGRATION_COUNT],
        );
        migrationsReady = migrations.rows[0]?.migrations_ready;
        schema = migrationsReady === true ? 'ok' : 'missing';
      }
      if (schema === 'missing')
        await logMissingSchema(
          client,
          result.rows[0]?.schema_ready,
          migrationsReady,
          connectionString,
        );
    } finally {
      await client.end();
    }
    database = 'ok';
  } catch (error) {
    console.error('[Readiness] Verification PostgreSQL echouee', {
      category: error instanceof Error ? error.name : 'UnknownError',
      timestamp: new Date().toISOString(),
    });
  }

  return { database, schema };
}

/** Verifie les dependances necessaires sans exposer de secret ni d'erreur interne. */
export async function checkReadiness(): Promise<ReadinessResult> {
  // Do not share the configuration result: it belongs to this invocation.
  const aiConfiguration = process.env['OPENAI_API_KEY'] ? 'ok' : 'missing';
  if (!databaseProbe) {
    databaseProbe = inspectDatabase().finally(() => {
      databaseProbe = undefined;
    });
  }
  const { database, schema } = await databaseProbe;
  return {
    ready: database === 'ok' && schema === 'ok' && aiConfiguration === 'ok',
    checks: { database, schema, aiConfiguration },
  };
}
