import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { runAdminBootstrap, targetDatabaseUrl, readSelectedAdminId } from './production-admin-bootstrap.mjs';
import { Client, databaseUrl, readDatabaseIdentity, fileHash, migrationFingerprint } from './db-operations.mjs';
import { checkHealth } from './cd-health-check.mjs';

class ReleaseError extends Error {
  constructor(reason, diagnostics) { super(reason); if (diagnostics) this.diagnostics = diagnostics; }
}
const fail = (message) => { throw new ReleaseError(message); };
const production = (item) => !item.gitBranch && (Array.isArray(item.target) ? item.target : [item.target]).includes('production');
const safeKey = (key) => /^[A-Z][A-Z0-9_]+$/.test(key);
const mutableKeys = new Set(['DATABASE_URL', 'PRODUCTION_ACCESS_MODE', 'ADMIN_EMAILS', 'BOOTSTRAP_ADMIN_USER_ID', 'APP_REVISION', 'API_URL', 'NEXT_PUBLIC_API_URL', 'FRONTEND_URL']);
const releaseStages = new Set(['input_validation', 'ci_verification', 'configuration_read', 'bootstrap_plan', 'source_reference', 'backup', 'rehearsal',
  'diagnostic_input', 'diagnostic_deployment_lookup', 'diagnostic_environment_pull', 'diagnostic_project_database_read', 'diagnostic_database_sql',
  'prepared_backup_verification', 'api_reference', 'web_reference', 'bootstrap_apply', 'admin_lookup_source', 'admin_lookup_target', 'admin_identity_comparison',
  ...['api', 'web'].flatMap((project) => ['env_readback', 'cleanup', 'pull', 'build', 'deploy', 'health', 'denied_probe', 'promote', 'alias_health', 'alias_denied_probe',
    ...[...mutableKeys].map((key) => `env_${key}`)].map((action) => `${project}_${action}`))]);
const bootstrapFailureReasons = new Set(['admin_not_unique', 'admin_identity_lookup_failed', 'admin_identity_mismatch', 'explicit_admin_email_required']);
const healthFailureReasons = new Map([
  ['Health JSON object required', 'health_payload_invalid'], ['Unexpected health service or status', 'health_service_or_status_mismatch'],
  ['Missing immutable revision', 'health_revision_missing'], ['Served revision differs from candidate', 'health_revision_mismatch'],
  ['Stale or invalid health timestamp', 'health_timestamp_invalid'], ['Required readiness check failed', 'health_readiness_failed'],
  ['Health response is not JSON', 'health_response_not_json'], ['Health redirect without destination', 'health_redirect_invalid'],
  ['Too many health redirects', 'health_redirect_limit'],
]);
const safeHealthChecks = (checks) => Object.fromEntries(['database', 'schema', 'aiConfiguration']
  .filter((key) => ['ok', 'missing', 'unavailable'].includes(checks?.[key])).map((key) => [key, checks[key]]));

export function safeReleaseFailure(error, stage) {
  const classes = new Set(['Error', 'TypeError', 'RangeError', 'SyntaxError', 'DOMException', 'AbortError', 'TimeoutError', 'AggregateError', 'ReleaseError', 'BootstrapError']);
  const errorClass = classes.has(error?.name) && error.name !== 'Error' ? error.name :
    classes.has(error?.constructor?.name) ? error.constructor.name : 'UnknownError';
  const pgCodes = new Set(['42501', '42P04', '3D000', '28P01', '28000', '08000', '08001', '08003', '08004', '08006', '08007', '08P01', '53300', '53400', '57014', '57P01', '57P02', '57P03', '55006', 'XX000']);
  const networkCodes = new Set(['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_SOCKET', 'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE']);
  const code = [error?.code, error?.cause?.code].find((value) => pgCodes.has(value) || networkCodes.has(value));
  const healthStage = ['api_health', 'web_health', 'api_alias_health', 'web_alias_health'].includes(stage);
  const healthHttp = healthStage && /^Health HTTP \d{3}$/.test(error?.message ?? '');
  const httpStatus = (error instanceof ReleaseError && /^vercel_http_\d{3}$/.test(error.message)) || healthHttp ? Number(error.message.slice(-3)) :
    Number.isInteger(error?.status) && error.status >= 100 && error.status <= 599 ? error.status : undefined;
  return {
    failedStage: releaseStages.has(stage) ? stage : 'unknown_stage', errorClass,
    reason: error instanceof ReleaseError ? error.message : errorClass === 'BootstrapError' && bootstrapFailureReasons.has(error.reason) ? error.reason :
      healthHttp ? 'health_http_error' : healthStage && healthFailureReasons.has(error?.message) ? healthFailureReasons.get(error.message) :
        healthStage && errorClass === 'SyntaxError' ? 'health_json_invalid' : 'private_diagnostics_required',
    category: errorClass === 'TimeoutError' || ['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT'].includes(code) ? 'timeout' :
      errorClass === 'AbortError' ? 'aborted' : pgCodes.has(code) ? 'postgresql' : networkCodes.has(code) ? 'network' :
        httpStatus >= 500 ? 'http_server_error' : httpStatus >= 400 ? 'http_client_error' : 'private_failure',
    ...(pgCodes.has(code) ? { pgCode: code } : {}), ...(networkCodes.has(code) ? { networkCode: code } : {}),
    ...(httpStatus === undefined ? {} : { httpStatus }),
    ...(healthStage && Object.keys(safeHealthChecks(error?.healthChecks)).length ? { healthChecks: safeHealthChecks(error.healthChecks) } : {}),
    ...(error instanceof ReleaseError && error.diagnostics ? { command: error.diagnostics } : {}),
  };
}

export function validateReleaseInput(env) {
  const mode = env.RELEASE_MODE ?? 'plan';
  if (!['plan', 'rehearse', 'deploy'].includes(mode)) fail('invalid_release_mode');
  if (!/^[a-f0-9]{40}$/.test(env.RELEASE_REVISION ?? '')) fail('immutable_release_revision_required');
  if (!/^[a-z][a-z0-9_]{2,62}$/.test(env.TARGET_DATABASE_NAME ?? '')) fail('explicit_new_database_name_required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.BOOTSTRAP_ADMIN_EMAIL ?? '')) fail('explicit_admin_email_required');
  if (env.ADMIN_IMPORT_POLICY && env.ADMIN_IMPORT_POLICY !== 'account-only') fail('account_only_import_required');
  if (env.BOOTSTRAP_REUSE_EXISTING && env.BOOTSTRAP_REUSE_EXISTING !== 'verified-admin-copy') fail('explicit_reuse_confirmation_required');
  for (const key of ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_API_PROJECT_ID', 'VERCEL_WEB_PROJECT_ID']) {
    if (!env[key]) fail(`missing_${key.toLowerCase()}`);
  }
  if (mode === 'deploy' && env.BOOTSTRAP_CONFIRM !== 'selective-admin-copy-to-new-database') fail('explicit_bootstrap_confirmation_required');
  if (mode !== 'plan' && Buffer.from(env.BACKUP_ENCRYPTION_KEY ?? '', 'base64').length !== 32) fail('backup_encryption_key_required');
  return mode;
}

function requireVerifiedReuse(report, env) {
  const requested = env.BOOTSTRAP_REUSE_EXISTING === 'verified-admin-copy';
  if ((report.targetReused === true || (report.targetExists === true && report.ready === true)) &&
      (!requested || report.targetReused !== true || report.existingTargetVerified !== true || report.targetCreated !== false)) fail('existing_target_reuse_not_verified');
}

export function strongSecret(value) {
  return typeof value === 'string' && value.length >= 32 && new Set(value).size >= 12 &&
    !/generate|change.?me|your_|example|placeholder|test.secret/i.test(value);
}

// Neon documents the pooled/direct pair as the same endpoint ID with only
// '-pooler' removed: https://neon.com/docs/connect/connection-pooling
export function directSourceUrl(value) {
  const source = databaseUrl(value);
  const derived = source.hostname.includes('-pooler.');
  if (derived) {
    const match = source.hostname.match(/^(ep-[a-z0-9-]+)-pooler\.([a-z0-9.-]+\.neon\.tech)$/);
    if (!match) fail('unrecognized_pooled_source_endpoint');
    source.hostname = `${match[1]}.${match[2]}`;
  }
  return { value: source.toString(), sourceDirectDerived: derived };
}

export class VercelProduction {
  constructor(env, fetcher = fetch) { this.env = env; this.fetcher = fetcher; }
  async request(path, method = 'GET', body) {
    const url = new URL(path, 'https://api.vercel.com');
    url.searchParams.set('teamId', this.env.VERCEL_ORG_ID);
    const response = await this.fetcher(url, { method, redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { Authorization: `Bearer ${this.env.VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    if (!response.ok) fail(`vercel_http_${response.status}`);
    return response.status === 204 ? {} : response.json();
  }
  async list(project) {
    const result = await this.request(`/v10/projects/${encodeURIComponent(project)}/env?decrypt=false`);
    if (!Array.isArray(result.envs)) fail('invalid_environment_metadata');
    return result.envs;
  }
  async variable(project, metadata, key, optional = false) {
    if (!safeKey(key)) fail('invalid_environment_key');
    const matches = metadata.filter((item) => item.key === key && production(item));
    if (optional && matches.length === 0) return null;
    if (matches.length !== 1 || !matches[0].id) fail(`missing_or_ambiguous_${key.toLowerCase()}`);
    const item = matches[0];
    if (['sensitive', 'secret'].includes(item.type) || item.visibility === 'secret') fail(`unreadable_${key.toLowerCase()}`);
    // Plain variables are already readable metadata. Vercel does not mark
    // their per-ID response as decrypted because no decryption took place.
    if (item.type === 'plain' && typeof item.value === 'string') return { ...item };
    const decrypted = await this.request(`/v1/projects/${encodeURIComponent(project)}/env/${encodeURIComponent(item.id)}`);
    if ((item.type !== 'plain' && decrypted.decrypted !== true) || typeof decrypted.value !== 'string') fail(`unreadable_${key.toLowerCase()}`);
    return { ...item, value: decrypted.value };
  }
  async snapshot(project, keys) {
    const metadata = await this.list(project);
    const entries = await Promise.all(keys.map(async (key) => [key, await this.variable(project, metadata, key, true)]));
    return Object.fromEntries(entries);
  }
  async previousDeployment(project) {
    const result = await this.request(`/v9/projects/${encodeURIComponent(project)}`);
    const url = result.targets?.production?.url;
    if (typeof url !== 'string' || !/^[a-z0-9.-]+\.vercel\.app$/.test(url)) fail('previous_production_deployment_required');
    return `https://${url}`;
  }
  async replace(project, original, key, value, undo) {
    if (!mutableKeys.has(key)) fail('environment_write_not_allowlisted');
    const base = `/v9/projects/${encodeURIComponent(project)}/env`;
    if (original && (Array.isArray(original.target) ? original.target : [original.target]).length === 1) {
      // Register compensation before mutation: a timed-out request may have succeeded.
      undo.push(async () => this.request(`${base}/${encodeURIComponent(original.id)}`, 'PATCH', { value: original.value, target: original.target, type: original.type }));
      await this.request(`${base}/${encodeURIComponent(original.id)}`, 'PATCH', { value, target: ['production'], type: original.type });
      return;
    }
    if (original) {
      undo.push(async () => this.request(`${base}/${encodeURIComponent(original.id)}`, 'PATCH', { value: original.value, target: original.target, type: original.type }));
      await this.request(`${base}/${encodeURIComponent(original.id)}`, 'PATCH', { target: original.target.filter((target) => target !== 'production') });
    }
    // Split shared values rather than changing preview/development configuration.
    undo.push(async () => {
      const matches = (await this.list(project)).filter((item) => item.key === key && production(item) && item.id !== original?.id);
      for (const item of matches) await this.request(`${base}/${encodeURIComponent(item.id)}`, 'DELETE');
    });
    // POST is v10; PATCH/DELETE intentionally remain v9 per the Vercel API.
    const result = await this.request(`/v10/projects/${encodeURIComponent(project)}/env`, 'POST', { key, value, target: ['production'], type: original?.type ?? 'encrypted' });
    const created = Array.isArray(result.created) ? result.created : [result.created];
    if ((result.failed?.length ?? 0) !== 0 || created.length !== 1 || !created[0]?.id || created[0].key !== key || !production(created[0])) fail('vercel_environment_create_failed');
  }
}

export async function inspectConfiguration(env, provider) {
  const apiKeys = ['DATABASE_URL', 'SERVICE_SECRET', 'AUTH_SECRET', 'PRODUCTION_ACCESS_MODE', 'ADMIN_EMAILS', 'BOOTSTRAP_ADMIN_USER_ID', 'APP_REVISION', 'FRONTEND_URL'];
  const webKeys = ['SERVICE_SECRET', 'AUTH_SECRET', 'PRODUCTION_ACCESS_MODE', 'ADMIN_EMAILS', 'APP_REVISION', 'API_URL', 'NEXT_PUBLIC_API_URL'];
  const [api, web, webMetadata] = await Promise.all([provider.snapshot(env.VERCEL_API_PROJECT_ID, apiKeys), provider.snapshot(env.VERCEL_WEB_PROJECT_ID, webKeys), provider.list(env.VERCEL_WEB_PROJECT_ID)]);
  const checks = {
    serviceSecretStrong: strongSecret(api.SERVICE_SECRET?.value) && strongSecret(web.SERVICE_SECRET?.value),
    serviceSecretMatches: Boolean(api.SERVICE_SECRET?.value) && api.SERVICE_SECRET.value === web.SERVICE_SECRET?.value,
    authSecretStrong: strongSecret(web.AUTH_SECRET?.value),
    authAndServiceDistinct: Boolean(web.AUTH_SECRET?.value) && web.AUTH_SECRET.value !== web.SERVICE_SECRET?.value,
    googleConfigurationPresent: ['AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET'].every((key) => webMetadata.filter((item) => item.key === key && production(item)).length === 1),
  };
  if (!api.DATABASE_URL?.value) fail('missing_production_database_url');
  const direct = directSourceUrl(api.DATABASE_URL.value);
  targetDatabaseUrl(direct.value, env.TARGET_DATABASE_NAME);
  return { api, web, source: direct.value, sourceDirectDerived: direct.sourceDirectDerived, checks, ready: Object.values(checks).every(Boolean) };
}

export async function requireSuccessfulCi(env, fetcher = fetch) {
  if (!env.GITHUB_TOKEN || !/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY ?? '')) fail('github_ci_configuration_required');
  const url = `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/actions/workflows/ci.yml/runs?head_sha=${env.RELEASE_REVISION}&per_page=100`;
  const response = await fetcher(url, { headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' }, redirect: 'error', signal: AbortSignal.timeout(20_000) });
  if (!response.ok) fail('ci_query_failed');
  const runs = (await response.json()).workflow_runs;
  const matching = (runs ?? []).filter((run) => run.head_sha === env.RELEASE_REVISION && ['push', 'workflow_dispatch'].includes(run.event));
  matching.sort((a, b) => b.id - a.id);
  if (!matching.length || matching[0].status !== 'completed' || matching[0].conclusion !== 'success') fail('successful_ci_for_exact_revision_required');
  return { runId: matching[0].id, revision: env.RELEASE_REVISION };
}

// Child output is deliberately captured: PostgreSQL, builders and provider CLIs
// can include decrypted environment values or database row data in diagnostics.
export function privateCommand(command, args, env, timeout = 600_000, {
  stage = 'private_command', spawn = spawnSync,
} = {}) {
  const allowedStages = new Set(['private_command', 'database_backup', 'database_restore', 'docker_start', 'docker_port', 'docker_cleanup',
    ...['api', 'web'].flatMap((project) => ['pull', 'build', 'deploy', 'promote', 'rollback'].map((action) => `${project}_${action}`))]);
  const tool = command === process.execPath ? 'node' : command === 'docker' ? 'docker' : command === 'npx' ? 'vercel_cli' : 'other';
  const result = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout, maxBuffer: 32 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    const reasons = { ETIMEDOUT: 'timeout', ENOENT: 'tool_missing', EACCES: 'tool_access_denied', ENOBUFS: 'output_limit' };
    throw new ReleaseError('private_command_failed', {
      stage: allowedStages.has(stage) ? stage : 'private_command', tool,
      exitCode: Number.isSafeInteger(result.status) ? result.status : null,
      category: Object.hasOwn(reasons, result.error?.code) ? reasons[result.error.code] : (result.signal ? 'terminated' : 'nonzero_exit'),
    });
  }
  return result.stdout;
}
const script = (name, env) => privateCommand(process.execPath, [fileURLToPath(new URL(`./${name}`, import.meta.url))], env, 600_000,
  { stage: name === 'db-backup.mjs' ? 'database_backup' : 'database_restore' });
const pause = (ms) => new Promise((done) => setTimeout(done, ms));

async function rehearse(env, directory, source, identity, bootstrap) {
  const password = randomBytes(32).toString('hex');
  const container = `alcide-admin-rehearsal-${randomBytes(8).toString('hex')}`;
  const dockerEnv = { ...env, POSTGRES_PASSWORD: password };
  let started = false;
  try {
    privateCommand('docker', ['run', '--detach', '--name', container, '--publish', '127.0.0.1::5432', '--env', 'POSTGRES_PASSWORD', '--env', 'POSTGRES_DB=restore_source', `postgres:${identity.databaseMajor}-alpine`], dockerEnv, 600_000, { stage: 'docker_start' });
    started = true;
    const port = privateCommand('docker', ['port', container, '5432/tcp'], dockerEnv, 600_000, { stage: 'docker_port' }).trim().match(/^127\.0\.0\.1:(\d+)$/)?.[1];
    if (!port) fail('isolated_restore_port_unavailable');
    const local = `postgresql://postgres:${password}@127.0.0.1:${port}/restore_source?sslmode=disable`;
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try { await readDatabaseIdentity(local); ready = true; break; } catch { await pause(1000); }
    }
    if (!ready) fail('isolated_restore_not_ready');
    const proof = resolve(directory, 'restore.json');
    script('db-restore-check.mjs', { ...env, RESTORE_DATABASE_URL: local, RESTORE_CONFIRM: 'isolated-empty-database', RESTORE_EVIDENCE_FILE: proof, RESTORE_APPLY_CANDIDATE_MIGRATIONS: '0' });
    const copied = await bootstrap({ ...env, SOURCE_DATABASE_URL: local, BOOTSTRAP_MODE: 'apply', BOOTSTRAP_CONFIRM: 'selective-admin-copy-to-new-database' });
    if (!copied.complete || !copied.ready || !copied.adminCopyVerified) fail('isolated_admin_copy_rehearsal_failed');
    if (copied.targetCreated !== true || copied.targetReused === true) fail('isolated_admin_copy_must_create_fresh_target');
    const evidence = { formatVersion: 1, revision: env.RELEASE_REVISION, targetDatabaseName: env.TARGET_DATABASE_NAME, importPolicy: env.ADMIN_IMPORT_POLICY,
      reuseExistingRequested: env.BOOTSTRAP_REUSE_EXISTING === 'verified-admin-copy', isolatedTargetCreated: true, isolatedTargetReused: false,
      sourceIdentity: identity.sourceIdentity, databaseMajor: identity.databaseMajor,
      performedAt: new Date().toISOString(), restoredCountsMatch: true, selectiveCopyVerified: true,
      encryptedSha256: await fileHash(`${env.BACKUP_FILE}.enc`), migrationFingerprint: JSON.parse(await readFile(`${env.BACKUP_FILE}.manifest.json`, 'utf8')).migrationFingerprint };
    await writeFile(resolve(directory, 'rehearsal.json'), JSON.stringify(evidence), { flag: 'wx', mode: 0o600 });
    return evidence;
  } finally {
    if (started) privateCommand('docker', ['rm', '--force', '--volumes', container], dockerEnv, 600_000, { stage: 'docker_cleanup' });
  }
}

async function verifyPreparedBackup(env, directory, source) {
  const [manifest, proof, identity] = await Promise.all([
    readFile(`${env.BACKUP_FILE}.manifest.json`, 'utf8').then(JSON.parse),
    readFile(resolve(directory, 'rehearsal.json'), 'utf8').then(JSON.parse), readDatabaseIdentity(source),
  ]);
  if (!manifest.encrypted || manifest.sourceIdentity !== identity.sourceIdentity || manifest.databaseMajor !== identity.databaseMajor ||
      manifest.candidateRevision !== env.RELEASE_REVISION || proof.revision !== env.RELEASE_REVISION ||
      proof.targetDatabaseName !== env.TARGET_DATABASE_NAME || proof.sourceIdentity !== identity.sourceIdentity ||
      proof.importPolicy !== env.ADMIN_IMPORT_POLICY || env.ADMIN_IMPORT_POLICY !== 'account-only' ||
      proof.reuseExistingRequested !== (env.BOOTSTRAP_REUSE_EXISTING === 'verified-admin-copy') || proof.isolatedTargetCreated !== true || proof.isolatedTargetReused !== false ||
      proof.selectiveCopyVerified !== true || proof.restoredCountsMatch !== true ||
      proof.migrationFingerprint !== manifest.migrationFingerprint || manifest.migrationFingerprint !== await migrationFingerprint() ||
      Date.now() - Date.parse(proof.performedAt) > 3_600_000 || Date.parse(proof.performedAt) > Date.now() + 60_000 || !Number.isFinite(Date.parse(proof.performedAt)) ||
      await fileHash(`${env.BACKUP_FILE}.enc`) !== manifest.encryptedSha256 || proof.encryptedSha256 !== manifest.encryptedSha256) fail('fresh_backup_rehearsal_required');
}

export async function checkUnauthenticatedApiDenied(base, { fetcher = fetch, bypassSecret } = {}) {
  const url = new URL('/workouts', base);
  if (url.protocol !== 'https:' || url.username || url.password) fail('invalid_protected_probe_url');
  const headers = { 'cache-control': 'no-cache' };
  if (bypassSecret && url.hostname.endsWith('.vercel.app')) headers['x-vercel-protection-bypass'] = bypassSecret;
  const response = await fetcher(url, { headers, redirect: 'error', signal: AbortSignal.timeout(20_000) });
  if (response.status !== 401 || !response.headers.get('content-type')?.includes('application/json')) fail('unauthenticated_api_access_not_denied');
  return { unauthenticatedProtectedApiStatus: 401 };
}

export async function verifyReleaseConfiguration(project, expected, provider) {
  const keys = Object.keys(expected);
  const actual = await provider.snapshot(project, keys);
  if (keys.some((key) => actual[key]?.value !== expected[key])) fail('release_environment_readback_mismatch');
  return { matched: true, keysVerified: keys.length };
}

async function inspectResolvedDatabase(value) {
  const client = new Client({ connectionString: databaseUrl(value).toString(), connectionTimeoutMillis: 15_000, statement_timeout: 15_000, query_timeout: 20_000 });
  try {
    await client.connect();
    await client.query('begin isolation level repeatable read read only');
    const database = (await client.query('select current_database() as name')).rows[0]?.name;
    const present = (await client.query("select to_regclass('drizzle.__drizzle_migrations') is not null as present")).rows[0]?.present === true;
    const history = present ? (await client.query('select count(*)::int as count, max(created_at)::text as latest from drizzle.__drizzle_migrations')).rows[0] : null;
    await client.query('rollback');
    return { databaseNameMatchesEnvironment: database === decodeURIComponent(databaseUrl(value).pathname.slice(1)),
      migrationTablePresent: present, migrationCount: Number.isSafeInteger(history?.count) ? history.count : null,
      latestMigrationTimestamp: history?.latest && /^\d{1,16}$/.test(history.latest) ? Number(history.latest) : null };
  } finally { await client.end().catch(() => undefined); }
}

// Vercel CLI 54.17.2 pulls fully resolved deployment env with GET /v3/env/pull/dpl_*:
// https://github.com/vercel/vercel/blob/vercel%4054.17.2/packages/cli/src/util/env/get-env-records.ts
// Read these values only in memory. Never serialize the provider response.
export async function inspectDeploymentDatabase(env, { provider = new VercelProduction(env), databaseInspector = inspectResolvedDatabase } = {}) {
  const report = { scope: 'immutable-deployment-database-configuration', readOnly: true, complete: false,
    environmentSource: 'vercel-resolved-deployment-environment', functionEnvironmentOverridesInspected: false };
  let failedStage = 'diagnostic_input';
  try {
    let candidate = env.DIAGNOSTIC_DEPLOYMENT_URL;
    const deploymentId = env.DIAGNOSTIC_DEPLOYMENT_ID;
    if (deploymentId && !/^dpl_[a-zA-Z0-9]+$/.test(deploymentId)) fail('invalid_diagnostic_deployment_id');
    if ((!deploymentId || candidate) && !/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(candidate ?? '')) fail('invalid_created_deployment_url');
    if (!/^[a-z][a-z0-9_]{2,62}$/.test(env.TARGET_DATABASE_NAME ?? '') || !env.VERCEL_API_PROJECT_ID) fail('diagnostic_configuration_required');
    failedStage = 'diagnostic_deployment_lookup';
    const deployment = await provider.request(`/v13/deployments/${encodeURIComponent(deploymentId ?? new URL(candidate).hostname)}`);
    if (!/^dpl_[a-zA-Z0-9]+$/.test(deployment.id ?? '') || (deploymentId && deployment.id !== deploymentId) ||
        deployment.projectId !== env.VERCEL_API_PROJECT_ID || !/^[a-z0-9-]+\.vercel\.app$/.test(deployment.url ?? '') ||
        (candidate && deployment.url !== new URL(candidate).hostname)) fail('diagnostic_deployment_project_mismatch');
    candidate = `https://${deployment.url}`;
    report.deploymentUrl = candidate;
    failedStage = 'diagnostic_environment_pull';
    // The pinned CLI always identifies the pull source with this query value.
    const resolved = await provider.request(`/v3/env/pull/${encodeURIComponent(deployment.id)}?source=vercel-cli%3Apull`);
    failedStage = 'diagnostic_project_database_read';
    const configured = await provider.snapshot(env.VERCEL_API_PROJECT_ID, ['DATABASE_URL']);
    if (typeof resolved.env?.DATABASE_URL !== 'string' || !configured.DATABASE_URL?.value) fail('deployment_runtime_database_unavailable');
    const runtime = databaseUrl(directSourceUrl(resolved.env.DATABASE_URL).value);
    const source = databaseUrl(directSourceUrl(configured.DATABASE_URL.value).value);
    const expected = new URL(source); expected.pathname = `/${env.TARGET_DATABASE_NAME}`;
    const runtimeName = decodeURIComponent(runtime.pathname.slice(1));
    failedStage = 'diagnostic_database_sql';
    const sql = await databaseInspector(runtime.toString());
    Object.assign(report, { complete: true, deploymentUrl: candidate,
      runtimeDatabaseNameSha256: createHash('sha256').update(runtimeName).digest('hex'),
      runtimeDatabaseNameMatchesTarget: runtimeName === env.TARGET_DATABASE_NAME,
      runtimeDatabaseNameMatchesCurrentProject: runtimeName === decodeURIComponent(source.pathname.slice(1)),
      runtimeEndpointMatchesCurrentProject: runtime.hostname === source.hostname && runtime.port === source.port,
      runtimeRoleMatchesCurrentProject: runtime.username === source.username,
      runtimeConnectionMatchesTarget: runtime.toString() === expected.toString(),
      runtimeAccessModeAdminOnly: resolved.env.PRODUCTION_ACCESS_MODE === 'admin-only',
      runtimeRevisionMatchesExpected: typeof env.RELEASE_REVISION === 'string' && /^[a-f0-9]{40}$/.test(env.RELEASE_REVISION) && resolved.env.APP_REVISION === env.RELEASE_REVISION,
      buildDatabaseConfigurationPresent: typeof resolved.buildEnv?.DATABASE_URL === 'string',
      sql: { databaseNameMatchesEnvironment: sql.databaseNameMatchesEnvironment === true,
        migrationTablePresent: sql.migrationTablePresent === true,
        migrationCount: Number.isSafeInteger(sql.migrationCount) && sql.migrationCount >= 0 ? sql.migrationCount : null,
        latestMigrationTimestamp: Number.isSafeInteger(sql.latestMigrationTimestamp) && sql.latestMigrationTimestamp >= 0 ? sql.latestMigrationTimestamp : null },
    });
  } catch (error) {
    report.reason = error instanceof ReleaseError ? error.message : 'private_diagnostics_required';
    report.failure = safeReleaseFailure(error, failedStage);
  }
  return report;
}

export async function checkReleaseHealth(url, expected, { bypassSecret, fetcher = fetch } = {}) {
  const origin = new URL(url).origin;
  return checkHealth(url, expected, { bypassSecret, fetchImpl: async (target, options) => {
    // Never forward automation credentials to another origin after a redirect.
    if (new URL(target).origin !== origin) fail('health_cross_origin_redirect_refused');
    const response = await fetcher(target, options);
    if (!response.ok && response.headers.get('content-type')?.includes('application/json')) {
      let payload;
      try { payload = await response.clone().json(); } catch { /* The ordinary JSON/status checks still fail closed. */ }
      if (payload?.service === expected.service && payload?.checks) {
        const checks = safeHealthChecks(payload.checks);
        const reason = checks.schema === 'missing' ? 'health_schema_missing' : checks.database === 'unavailable' ? 'health_database_unavailable' :
          checks.aiConfiguration === 'missing' ? 'health_ai_configuration_missing' : 'health_http_error';
        const error = new ReleaseError(reason); error.status = response.status; error.healthChecks = checks; throw error;
      }
    }
    return response;
  } });
}

export async function deployClosedProduction(env, configuration, provider, { bootstrap = runAdminBootstrap, command = privateCommand, health = checkReleaseHealth,
  verifyConfiguration = verifyReleaseConfiguration,
  selectedAdminId = readSelectedAdminId, denied = checkUnauthenticatedApiDenied, cleanup = () => rm(resolve('.vercel'), { force: true, recursive: true }) } = {}) {
  const undo = [];
  const previous = [];
  let failedStage = 'api_reference';
  const cli = (project, args, action = args[0]) => command('npx', ['--yes', 'vercel@54.17.2', ...args, '--token', env.VERCEL_TOKEN], { ...env, VERCEL_PROJECT_ID: project, VERCEL_TELEMETRY_DISABLED: '1', VERCEL_FORCE_BUILD: '1', APP_REVISION: env.RELEASE_REVISION }, 1_200_000,
    { stage: `${project === env.VERCEL_API_PROJECT_ID ? 'api' : 'web'}_${action}` });
  const urls = [];
  let bootstrapResult;
  let promotionAttempted = false;
  try {
    previous.push(await provider.previousDeployment(env.VERCEL_API_PROJECT_ID));
    failedStage = 'web_reference';
    previous.push(await provider.previousDeployment(env.VERCEL_WEB_PROJECT_ID));
    failedStage = 'bootstrap_apply';
    bootstrapResult = await bootstrap({ ...env, ADMIN_IMPORT_POLICY: env.ADMIN_IMPORT_POLICY ?? 'account-only', SOURCE_DATABASE_URL: configuration.source, BOOTSTRAP_MODE: 'apply' });
    if (!bootstrapResult.complete || !bootstrapResult.ready || !bootstrapResult.adminCopyVerified) fail('production_admin_copy_failed');
    requireVerifiedReuse(bootstrapResult, env);
    const newDatabase = targetDatabaseUrl(configuration.source, env.TARGET_DATABASE_NAME);
    failedStage = 'admin_lookup_source';
    const adminId = await selectedAdminId(configuration.source, env.BOOTSTRAP_ADMIN_EMAIL);
    failedStage = 'admin_lookup_target';
    const copiedAdminId = await selectedAdminId(newDatabase, env.BOOTSTRAP_ADMIN_EMAIL);
    failedStage = 'admin_identity_comparison';
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(adminId ?? '') || adminId !== copiedAdminId) fail('copied_admin_identity_mismatch');
    const values = [
      { DATABASE_URL: newDatabase, PRODUCTION_ACCESS_MODE: 'admin-only', ADMIN_EMAILS: env.BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_USER_ID: adminId, APP_REVISION: env.RELEASE_REVISION, FRONTEND_URL: 'https://www.alcideai.fr' },
      { PRODUCTION_ACCESS_MODE: 'admin-only', ADMIN_EMAILS: env.BOOTSTRAP_ADMIN_EMAIL, APP_REVISION: env.RELEASE_REVISION, API_URL: 'https://ai-sport-api.vercel.app', NEXT_PUBLIC_API_URL: 'https://ai-sport-api.vercel.app' },
    ];
    for (const [index, project] of [env.VERCEL_API_PROJECT_ID, env.VERCEL_WEB_PROJECT_ID].entries()) {
      const component = index === 0 ? 'api' : 'web';
      for (const [key, value] of Object.entries(values[index])) {
        failedStage = `${component}_env_${key}`;
        await provider.replace(project, index === 0 ? configuration.api[key] : configuration.web[key], key, value, undo);
      }
      failedStage = `${component}_env_readback`;
      await verifyConfiguration(project, values[index], provider);
      // Each project must get an independent pull/build cache.
      failedStage = `${component}_cleanup`;
      await cleanup();
      failedStage = `${component}_pull`;
      cli(project, ['pull', '--yes', '--environment=production']);
      failedStage = `${component}_build`;
      cli(project, ['build', '--prod']);
      failedStage = `${component}_deploy`;
      const output = cli(project, ['deploy', '--prebuilt', '--prod', '--skip-domain', '--meta', `sourceRevision=${env.RELEASE_REVISION}`]);
      const url = output.trim().split(/\r?\n/).at(-1)?.trim();
      if (!/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(url ?? '')) fail('invalid_created_deployment_url');
      urls.push(url);
      failedStage = `${component}_health`;
      await health(`${url}${index === 0 ? '/health/ready' : '/api/health'}`, { service: index === 0 ? 'alcide-api' : 'alcide-web', status: index === 0 ? 'ready' : 'ok', revision: env.RELEASE_REVISION }, { bypassSecret: env.VERCEL_AUTOMATION_BYPASS_SECRET });
      if (index === 0) { failedStage = 'api_denied_probe'; await denied(url, { bypassSecret: env.VERCEL_AUTOMATION_BYPASS_SECRET }); }
    }
    for (const [index, project] of [env.VERCEL_API_PROJECT_ID, env.VERCEL_WEB_PROJECT_ID].entries()) {
      const component = index === 0 ? 'api' : 'web';
      failedStage = `${component}_promote`;
      promotionAttempted = true;
      cli(project, ['promote', urls[index], '--yes']);
      failedStage = `${component}_alias_health`;
      await health(index === 0 ? 'https://ai-sport-api.vercel.app/health/ready' : 'https://www.alcideai.fr/api/health', { service: index === 0 ? 'alcide-api' : 'alcide-web', status: index === 0 ? 'ready' : 'ok', revision: env.RELEASE_REVISION });
      if (index === 0) { failedStage = 'api_alias_denied_probe'; await denied('https://ai-sport-api.vercel.app'); }
    }
    return { complete: true, access: 'admin-only', revision: env.RELEASE_REVISION, reuseExistingRequested: env.BOOTSTRAP_REUSE_EXISTING === 'verified-admin-copy', deploymentUrls: urls, previousDeploymentUrls: previous, unauthenticatedProtectedApiStatus: 401, bootstrap: bootstrapResult };
  } catch (error) {
    let rollbackComplete = true;
    if (promotionAttempted) {
      // Roll back Web before API to stop new callers using the new API policy.
      for (const index of [1, 0]) {
        try { cli([env.VERCEL_API_PROJECT_ID, env.VERCEL_WEB_PROJECT_ID][index], ['promote', previous[index], '--yes'], 'rollback'); } catch { rollbackComplete = false; }
      }
    }
    for (const compensate of undo.reverse()) { try { await compensate(); } catch { rollbackComplete = false; } }
    return { complete: false, reason: rollbackComplete ? 'release_failed_rollback_completed' : 'release_failed_manual_rollback_required', rollbackComplete,
      failure: safeReleaseFailure(error, failedStage),
      stagedDeploymentUrls: urls,
      newDatabaseRetained: bootstrapResult?.targetCreated === true, existingDatabaseRetained: bootstrapResult?.targetReused === true, previousDeploymentUrls: previous };
  } finally { await cleanup(); }
}

export async function runProductionAdminRelease(input, { provider, bootstrap = runAdminBootstrap, fetcher = fetch } = {}) {
  const report = { performedAt: new Date().toISOString(), scope: 'closed-admin-technical-release', complete: false };
  let failedStage = 'input_validation';
  try {
    const mode = validateReleaseInput(input);
    report.mode = mode; report.revision = input.RELEASE_REVISION; report.reuseExistingRequested = input.BOOTSTRAP_REUSE_EXISTING === 'verified-admin-copy';
    const env = { ...input, ADMIN_IMPORT_POLICY: input.ADMIN_IMPORT_POLICY ?? 'account-only' };
    const client = provider ?? new VercelProduction(env, fetcher);
    if (mode === 'deploy') { failedStage = 'ci_verification'; report.ci = await requireSuccessfulCi(env, fetcher); }
    failedStage = 'configuration_read';
    const configuration = await inspectConfiguration(env, client);
    report.configuration = configuration.checks; report.sourceDirectDerived = configuration.sourceDirectDerived;
    failedStage = 'bootstrap_plan';
    report.bootstrap = await bootstrap({ ...env, SOURCE_DATABASE_URL: configuration.source, BOOTSTRAP_MODE: 'plan' });
    if (!report.bootstrap.complete || !report.bootstrap.ready || !configuration.ready) { report.reason = 'production_preconditions_failed'; return report; }
    requireVerifiedReuse(report.bootstrap, env);
    if (mode === 'plan') { report.complete = true; return report; }
    const directory = resolve(env.RELEASE_DIRECTORY ?? resolve(env.RUNNER_TEMP ?? '.', 'alcide-admin-release'));
    await mkdir(directory, { recursive: true, mode: 0o700 });
    env.BACKUP_FILE = resolve(directory, 'release.dump');
    const phase = env.RELEASE_PHASE ?? 'prepare';
    if (!['prepare', 'release'].includes(phase) || (mode !== 'deploy' && phase !== 'prepare')) fail('invalid_release_phase');
    if (phase === 'prepare') {
      failedStage = 'source_reference';
      const identity = await readDatabaseIdentity(configuration.source);
      if (![16, 17, 18].includes(identity.databaseMajor)) fail('unsupported_postgresql_major');
      env.PG_TOOLS_DOCKER_IMAGE = `postgres:${identity.databaseMajor}-alpine`;
      failedStage = 'backup';
      script('db-backup.mjs', { ...env, DATABASE_URL: configuration.source });
      failedStage = 'rehearsal';
      report.rehearsal = await rehearse(env, directory, configuration.source, identity, bootstrap);
      report.complete = true; report.phase = 'prepared'; return report;
    }
    failedStage = 'prepared_backup_verification';
    await verifyPreparedBackup(env, directory, configuration.source);
    Object.assign(report, await deployClosedProduction(env, configuration, client, { bootstrap }));
    return report;
  } catch (error) {
    report.reason = error instanceof ReleaseError ? error.message : 'private_diagnostics_required';
    report.failure = safeReleaseFailure(error, failedStage);
    if (error instanceof ReleaseError && error.diagnostics) report.command = error.diagnostics;
    return report;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runProductionAdminRelease(process.env);
  const evidence = process.env.RELEASE_EVIDENCE_FILE ?? process.env.ADMIN_RELEASE_EVIDENCE_FILE;
  if (evidence) await writeFile(evidence, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify(result));
  if (!result.complete) process.exitCode = 1;
}
