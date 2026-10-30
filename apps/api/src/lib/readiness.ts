import { normalizeDatabaseUrl } from '../db/database-url.js';

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
export const READINESS_MIGRATION_TIMESTAMP = 1793285084959;
export const READINESS_MIGRATION_COUNT = 13;

const REQUIRED_TABLES = [
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
  'public.account_revocations',
  'public.session_log_operations',
  'drizzle.__drizzle_migrations',
];

// A single physical database probe per process, including its connection cleanup.
// Completed results are not cached: a failed probe must recover on the next call.
let databaseProbe: Promise<DatabaseChecks> | undefined;

async function inspectDatabase(): Promise<DatabaseChecks> {
  let database: ReadinessResult['checks']['database'] = 'unavailable';
  let schema: ReadinessResult['checks']['schema'] = 'missing';

  try {
    // Import differe : /health reste une sonde de vie sans acces aux dependances.
    const { Client } = await import('pg');
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('MissingDatabaseConfiguration');
    // A dedicated, bounded connection is closed on every path. The timeout
    // cancels the server statement as well as bounding a lost network response;
    // no Promise.race leaves a background pooled query running after the probe.
    const client = new Client({
      connectionString: normalizeDatabaseUrl(url),
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
      if (result.rows[0]?.schema_ready === true) {
        const migrations = await client.query<{ migrations_ready: boolean }>(
          `select coalesce(max(created_at) >= $1, false) and count(*) >= $2 as migrations_ready
           from drizzle.__drizzle_migrations`,
          [READINESS_MIGRATION_TIMESTAMP, READINESS_MIGRATION_COUNT],
        );
        schema = migrations.rows[0]?.migrations_ready === true ? 'ok' : 'missing';
      }
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
