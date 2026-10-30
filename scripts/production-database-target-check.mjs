import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Client, databaseIdentity, databaseUrl, readDatabaseIdentity } from './db-operations.mjs';
import { inspectDatabaseMigrationLineage } from './db-migration-lineage.mjs';

function connectionComparisons(sourceValue, configuredValue) {
  const source = databaseUrl(sourceValue);
  const configured = databaseUrl(configuredValue);
  return {
    rawConnectionConfigurationMatches: sourceValue === configuredValue,
    endpointHostMatches: source.hostname === configured.hostname,
    databaseNameMatches: decodeURIComponent(source.pathname.slice(1)) === decodeURIComponent(configured.pathname.slice(1)),
    roleMatches: decodeURIComponent(source.username) === decodeURIComponent(configured.username),
  };
}

function lineageMetadata(lineage) {
  const count = (value) => Number.isSafeInteger(value) && value >= 0;
  if (typeof lineage?.compatible !== 'boolean' || !count(lineage.appliedMigrations) ||
      !count(lineage.matchedPrefix) || lineage.matchedPrefix > lineage.appliedMigrations) {
    throw new Error('Invalid lineage diagnostic');
  }
  const result = { compatible: lineage.compatible, appliedMigrations: lineage.appliedMigrations, matchedPrefix: lineage.matchedPrefix };
  if (lineage.compatible) {
    if (!count(lineage.pendingMigrations) || lineage.matchedPrefix !== lineage.appliedMigrations) throw new Error('Invalid lineage diagnostic');
    return { ...result, pendingMigrations: lineage.pendingMigrations };
  }
  if (!['history_missing', 'history_divergent'].includes(lineage.reason)) throw new Error('Invalid lineage diagnostic');
  return { ...result, reason: lineage.reason };
}

async function inspectConfiguredDatabase(value, { clientFactory, identityInspector, lineageInspector }) {
  const client = clientFactory({
    connectionString: databaseUrl(value).toString(), connectionTimeoutMillis: 5_000,
    statement_timeout: 3_000, query_timeout: 4_000,
  });
  try {
    await client.connect();
    await client.query('begin isolation level repeatable read read only');
    const identity = await identityInspector(client);
    const migrationLineage = lineageMetadata(await lineageInspector(client));
    await client.query('rollback');
    return { ...identity, migrationLineage };
  } finally {
    await client.end().catch(() => undefined);
  }
}

// Inspect only the configured API database. Never export its URL, credentials,
// decrypted response, request headers or raw driver errors.
export async function checkProductionDatabaseTarget(env, {
  fetcher = fetch, identityReader = readDatabaseIdentity,
  clientFactory = (configuration) => new Client(configuration),
  identityInspector = databaseIdentity, lineageInspector = inspectDatabaseMigrationLineage,
} = {}) {
  const base = { performedAt: new Date().toISOString(), readOnly: true, scope: 'configured-production-api-database' };
  let comparisons = {};
  try {
    const referenceValue = env.ALCIDE_DATABASE_URL !== undefined ? env.ALCIDE_DATABASE_URL : env.DATABASE_URL;
    if (!env.VERCEL_TOKEN || !env.VERCEL_ORG_ID || !env.VERCEL_API_PROJECT_ID || !referenceValue) {
      return { ...base, complete: false, reason: 'missing_configuration' };
    }
    const get = async (path) => {
      const url = new URL(path, 'https://api.vercel.com');
      url.searchParams.set('teamId', env.VERCEL_ORG_ID);
      const response = await fetcher(url, {
        headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}` }, redirect: 'error', signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`http_${response.status}`);
      return response.json();
    };
    const project = encodeURIComponent(env.VERCEL_API_PROJECT_ID);
    const metadata = await get(`/v10/projects/${project}/env?decrypt=false`);
    const production = (item) => (Array.isArray(item.target) ? item.target : [item.target]).includes('production') && !item.gitBranch;
    const overrides = (metadata.envs ?? []).filter((item) => item.key === 'ALCIDE_DATABASE_URL' && production(item));
    const matches = overrides.length ? overrides : (metadata.envs ?? []).filter((item) => item.key === 'DATABASE_URL' && production(item));
    if (matches.length !== 1) return { ...base, complete: false, reason: 'missing_or_ambiguous_database_configuration' };
    const variable = matches[0];
    if (!variable.id || variable.visibility === 'secret' || variable.type === 'sensitive' || variable.type === 'secret') {
      return { ...base, complete: false, reason: 'database_configuration_not_readable' };
    }
    const decrypted = variable.type === 'plain' && typeof variable.value === 'string' ? variable :
      await get(`/v1/projects/${project}/env/${encodeURIComponent(variable.id)}`);
    if ((variable.type !== 'plain' && decrypted.decrypted !== true) || typeof decrypted.value !== 'string' || !decrypted.value) {
      return { ...base, complete: false, reason: 'database_configuration_not_readable' };
    }
    comparisons = connectionComparisons(referenceValue, decrypted.value);
    const [source, configured] = await Promise.all([
      identityReader(referenceValue), inspectConfiguredDatabase(decrypted.value, { clientFactory, identityInspector, lineageInspector }),
    ]);
    const sameDatabase = source.sourceIdentity === configured.sourceIdentity && source.databaseMajor === configured.databaseMajor;
    return { ...base, ...comparisons, complete: true, sameDatabase, databaseMajor: configured.databaseMajor, configuredApplicationOverride: overrides.length === 1,
      configuredMigrationLineage: configured.migrationLineage };
  } catch (error) {
    const reason = /^http_\d{3}$/.test(error?.message ?? '') ? error.message : 'private_diagnostics_required';
    return { ...base, ...comparisons, complete: false, reason };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await checkProductionDatabaseTarget(process.env);
  await writeFile(process.env.DATABASE_TARGET_EVIDENCE_FILE ?? 'database-target.json', `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify(result));
  if (!result.complete || !result.sameDatabase) process.exitCode = 1;
}
