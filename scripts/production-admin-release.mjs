import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, unlink, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { runAdminBootstrap, targetDatabaseUrl, readSelectedAdminId } from './production-admin-bootstrap.mjs';
import { Client, databaseUrl, readDatabaseIdentity, fileHash, migrationFingerprint, require } from './db-operations.mjs';
import { checkHealth } from './cd-health-check.mjs';

class ReleaseError extends Error {
  constructor(reason, diagnostics) { super(reason); if (diagnostics) this.diagnostics = diagnostics; }
}
const fail = (message) => { throw new ReleaseError(message); };
const production = (item) => !item.gitBranch && (Array.isArray(item.target) ? item.target : [item.target]).includes('production');
const safeKey = (key) => /^[A-Z][A-Z0-9_]+$/.test(key);
const mutableKeys = new Set(['DATABASE_URL', 'ALCIDE_DATABASE_URL', 'PRODUCTION_ACCESS_MODE', 'ADMIN_EMAILS', 'BOOTSTRAP_ADMIN_USER_ID', 'APP_REVISION', 'API_URL', 'NEXT_PUBLIC_API_URL', 'FRONTEND_URL', 'AUTH_URL', 'NEXTAUTH_URL']);
const releaseStages = new Set(['input_validation', 'ci_verification', 'configuration_read', 'bootstrap_plan', 'source_reference', 'backup', 'rehearsal',
  'diagnostic_input', 'diagnostic_deployment_lookup', 'diagnostic_environment_pull', 'diagnostic_project_environment_pull', 'diagnostic_project_database_read', 'diagnostic_database_sql',
  'prepared_backup_verification', 'api_reference', 'web_reference', 'bootstrap_apply', 'admin_lookup_source', 'admin_lookup_target', 'admin_identity_comparison',
  ...['api', 'web'].flatMap((project) => ['env_readback', 'cleanup', 'pull', 'build', 'function_environment', 'build_artifacts', 'deploy', 'health', 'oauth_configuration', 'automation_bypass_create', 'automation_bypass_revoke', 'denied_probe', 'promote', 'alias_health', 'alias_denied_probe',
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

export function safeVercelValidation(payload) {
  const error = payload?.error ?? payload;
  const message = typeof error?.message === 'string' ? error.message.slice(0, 4096).toLowerCase() : '';
  return {
    ...(typeof error?.code === 'string' && /^[a-z_]{1,60}$/.test(error.code) ? { code: error.code } : {}),
    signals: {
      mentionsDeployment: /deployment/.test(message), mentionsSource: /\bsource\b/.test(message),
      mentionsProjectId: /project.?id/.test(message), mentionsTeamId: /team.?id/.test(message),
      mentionsSecret: /secret/.test(message),
      secretLengthConstraint: /secret/.test(message) && /length|characters?|minimum|maximum/.test(message),
      mentionsMinLength: /min.?length|minimum|at least|shorter than/.test(message),
      mentionsMaxLength: /max.?length|maximum|at most|longer than/.test(message),
      mentions32: /\b32\b/.test(message),
      unsupported: /unsupported|not supported/.test(message), invalidId: /invalid.{0,80}\bid\b|invalid.{0,80}deployment/.test(message),
      invalidParameter: /invalid.{0,80}(parameter|query|property)|invalid request/.test(message),
      requiredParameter: /required|missing.{0,40}(parameter|property)/.test(message),
      additionalParameter: /additional propert|unknown (query|parameter)|unexpected (query|parameter)/.test(message),
      decryptionForbidden: /(decrypt.{0,80}(forbidden|denied|not allowed))|((forbidden|denied|not allowed).{0,80}decrypt)/.test(message),
    },
  };
}

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
    ...(error instanceof ReleaseError && error.providerValidation ? { providerValidation: error.providerValidation } : {}),
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
    if (!response.ok) {
      const error = new ReleaseError(`vercel_http_${response.status}`);
      try { error.providerValidation = safeVercelValidation(await response.json()); } catch { /* Never retain raw response/error text. */ }
      throw error;
    }
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
  async temporaryAutomationBypass(project, undo) {
    // Vercel's official provider validates /^[a-zA-Z0-9]{32}$/ for custom
    // automation secrets. Sixteen random bytes become 32 valid hex chars.
    const secret = randomBytes(16).toString('hex');
    const projectPath = `/v9/projects/${encodeURIComponent(project)}`;
    const bypassPath = `/v1/projects/${encodeURIComponent(project)}/protection-bypass`;
    let finished = false;
    const revoke = async () => {
      if (finished) return;
      const current = await this.request(projectPath);
      if (!Object.hasOwn(current.protectionBypass ?? {}, secret)) { finished = true; return; }
      const result = await this.request(bypassPath, 'PATCH', { revoke: { secret, regenerate: false } });
      const remaining = result.protectionBypass ?? (await this.request(projectPath)).protectionBypass;
      if (Object.hasOwn(remaining ?? {}, secret)) fail('automation_bypass_revocation_not_verified');
      finished = true;
    };
    // Compensate even when a timed-out generation request actually succeeded.
    undo.push(revoke);
    const run = /^\d+$/.test(this.env.GITHUB_RUN_ID ?? '') ? this.env.GITHUB_RUN_ID : 'manual';
    const attempt = /^\d+$/.test(this.env.GITHUB_RUN_ATTEMPT ?? '') ? this.env.GITHUB_RUN_ATTEMPT : '1';
    const result = await this.request(bypassPath, 'PATCH', { generate: { secret, note: `Alcide closed release validation ${run}-${attempt}` } });
    if (result.protectionBypass?.[secret]?.scope !== 'automation-bypass') fail('automation_bypass_generation_not_verified');
    return { secret, revoke };
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
  const apiKeys = ['DATABASE_URL', 'ALCIDE_DATABASE_URL', 'SERVICE_SECRET', 'AUTH_SECRET', 'PRODUCTION_ACCESS_MODE', 'ADMIN_EMAILS', 'BOOTSTRAP_ADMIN_USER_ID', 'APP_REVISION', 'FRONTEND_URL'];
  const webKeys = ['SERVICE_SECRET', 'AUTH_SECRET', 'PRODUCTION_ACCESS_MODE', 'ADMIN_EMAILS', 'APP_REVISION', 'API_URL', 'NEXT_PUBLIC_API_URL', 'AUTH_URL', 'NEXTAUTH_URL'];
  const [api, web, webMetadata] = await Promise.all([provider.snapshot(env.VERCEL_API_PROJECT_ID, apiKeys), provider.snapshot(env.VERCEL_WEB_PROJECT_ID, webKeys), provider.list(env.VERCEL_WEB_PROJECT_ID)]);
  const checks = {
    serviceSecretStrong: strongSecret(api.SERVICE_SECRET?.value) && strongSecret(web.SERVICE_SECRET?.value),
    serviceSecretMatches: Boolean(api.SERVICE_SECRET?.value) && api.SERVICE_SECRET.value === web.SERVICE_SECRET?.value,
    authSecretStrong: strongSecret(web.AUTH_SECRET?.value),
    authAndServiceDistinct: Boolean(web.AUTH_SECRET?.value) && web.AUTH_SECRET.value !== web.SERVICE_SECRET?.value,
    googleConfigurationPresent: ['AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET'].every((key) => webMetadata.filter((item) => item.key === key && production(item)).length === 1),
  };
  const applicationOverrideSelected = api.ALCIDE_DATABASE_URL !== null && api.ALCIDE_DATABASE_URL !== undefined;
  const effective = applicationOverrideSelected ? api.ALCIDE_DATABASE_URL : api.DATABASE_URL;
  if (!effective?.value) fail('missing_production_database_url');
  const direct = directSourceUrl(effective.value);
  targetDatabaseUrl(direct.value, env.TARGET_DATABASE_NAME);
  return { api, web, source: direct.value, sourceDirectDerived: direct.sourceDirectDerived, applicationOverrideSelected, checks, ready: Object.values(checks).every(Boolean) };
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
    let resolved;
    try { resolved = await provider.request(`/v3/env/pull/${encodeURIComponent(deployment.id)}?source=vercel-cli%3Apull`); }
    catch (error) {
      if (error instanceof ReleaseError && error.message === 'vercel_http_400') {
        const control = { scope: 'current-project-production-only', immutableDeploymentObserved: false, complete: false };
        try {
          const current = await provider.request(`/v3/env/pull/${encodeURIComponent(env.VERCEL_API_PROJECT_ID)}/production?source=vercel-cli%3Apull`);
          control.complete = true;
          const currentValue = current.env?.ALCIDE_DATABASE_URL !== undefined ? current.env.ALCIDE_DATABASE_URL : current.env?.DATABASE_URL;
          control.applicationOverrideSelected = current.env?.ALCIDE_DATABASE_URL !== undefined;
          control.databaseConfigurationPresent = typeof currentValue === 'string' && Boolean(currentValue);
          if (control.databaseConfigurationPresent) control.databaseNameMatchesTarget = decodeURIComponent(databaseUrl(currentValue).pathname.slice(1)) === env.TARGET_DATABASE_NAME;
        } catch (controlError) { control.failure = safeReleaseFailure(controlError, 'diagnostic_project_environment_pull'); }
        report.projectEnvironmentPullDiagnostic = control;
      }
      throw error;
    }
    failedStage = 'diagnostic_project_database_read';
    const configured = await provider.snapshot(env.VERCEL_API_PROJECT_ID, ['DATABASE_URL', 'ALCIDE_DATABASE_URL']);
    const runtimeOverrideSelected = resolved.env?.ALCIDE_DATABASE_URL !== undefined;
    const runtimeValue = runtimeOverrideSelected ? resolved.env.ALCIDE_DATABASE_URL : resolved.env?.DATABASE_URL;
    const configuredValue = configured.ALCIDE_DATABASE_URL !== undefined && configured.ALCIDE_DATABASE_URL !== null ? configured.ALCIDE_DATABASE_URL?.value : configured.DATABASE_URL?.value;
    if (typeof runtimeValue !== 'string' || !runtimeValue || !configuredValue) fail('deployment_runtime_database_unavailable');
    const runtime = databaseUrl(directSourceUrl(runtimeValue).value);
    const source = databaseUrl(directSourceUrl(configuredValue).value);
    const expected = new URL(source); expected.pathname = `/${env.TARGET_DATABASE_NAME}`;
    const runtimeName = decodeURIComponent(runtime.pathname.slice(1));
    failedStage = 'diagnostic_database_sql';
    const sql = await databaseInspector(runtime.toString());
    Object.assign(report, { complete: true, deploymentUrl: candidate,
      applicationDatabaseOverrideSelected: runtimeOverrideSelected,
      runtimeDatabaseNameSha256: createHash('sha256').update(runtimeName).digest('hex'),
      runtimeDatabaseNameMatchesTarget: runtimeName === env.TARGET_DATABASE_NAME,
      runtimeDatabaseNameMatchesCurrentProject: runtimeName === decodeURIComponent(source.pathname.slice(1)),
      runtimeEndpointMatchesCurrentProject: runtime.hostname === source.hostname && runtime.port === source.port,
      runtimeRoleMatchesCurrentProject: runtime.username === source.username,
      runtimeConnectionMatchesTarget: runtime.toString() === expected.toString(),
      runtimeAccessModeAdminOnly: resolved.env.PRODUCTION_ACCESS_MODE === 'admin-only',
      runtimeRevisionMatchesExpected: typeof env.RELEASE_REVISION === 'string' && /^[a-f0-9]{40}$/.test(env.RELEASE_REVISION) && resolved.env.APP_REVISION === env.RELEASE_REVISION,
      buildDatabaseConfigurationPresent: typeof (resolved.buildEnv?.ALCIDE_DATABASE_URL !== undefined ? resolved.buildEnv.ALCIDE_DATABASE_URL : resolved.buildEnv?.DATABASE_URL) === 'string',
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

export async function checkReleaseHealth(url, expected, { bypassSecret, fetcher = fetch, pause: pauseImpl = pause } = {}) {
  const origin = new URL(url).origin;
  return checkHealth(url, expected, { bypassSecret, fetchImpl: async (target, options) => {
    // Never forward automation credentials to another origin after a redirect.
    if (new URL(target).origin !== origin) fail('health_cross_origin_redirect_refused');
    let response = await fetcher(target, options);
    const automationPropagationRedirect = (candidate) => {
      if (!bypassSecret || ![302, 303, 307, 308].includes(candidate.status)) return false;
      const location = candidate.headers.get('location');
      if (!location) return false;
      try {
        const redirect = new URL(location, target);
        return !redirect.username && !redirect.password && redirect.origin === 'https://vercel.com' && redirect.pathname === '/sso-api';
      } catch { return false; }
    };
    // A newly registered automation token can take a few seconds to propagate.
    // Retry only the provider's exact SSO redirect, always on this original URL.
    for (const delay of [1000, 2000, 4000, 8000]) {
      if (!automationPropagationRedirect(response)) break;
      await pauseImpl(delay);
      response = await fetcher(target, options);
    }
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

export async function checkWebOAuthConfiguration(base, { bypassSecret, fetcher = fetch } = {}) {
  if (!/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(base ?? '')) fail('invalid_created_deployment_url');
  const url = new URL('/api/auth/providers', base);
  const headers = { 'cache-control': 'no-cache' };
  if (bypassSecret) headers['x-vercel-protection-bypass'] = bypassSecret;
  const response = await fetcher(url, { headers, redirect: 'manual', signal: AbortSignal.timeout(20_000) });
  if ([301, 302, 303, 307, 308].includes(response.status)) fail('web_oauth_configuration_redirect_refused');
  if (!response.ok) { const error = new ReleaseError('web_oauth_configuration_http_error'); error.status = response.status; throw error; }
  if (!response.headers.get('content-type')?.includes('application/json')) fail('web_oauth_configuration_not_json');
  let providers;
  try { providers = await response.json(); } catch { fail('web_oauth_configuration_invalid_json'); }
  if (providers?.google?.id !== 'google' || providers.google.callbackUrl !== 'https://www.alcideai.fr/api/auth/callback/google') fail('web_oauth_canonical_callback_mismatch');
  return { googleProviderConfigured: true, canonicalCallbackVerified: true };
}

export async function cleanupVercelCheckout(env, { cwd = process.cwd() } = {}) {
  const root = resolve(cwd);
  if (env.GITHUB_ACTIONS !== 'true' || !env.GITHUB_WORKSPACE || resolve(env.GITHUB_WORKSPACE) !== root) fail('vercel_cleanup_requires_github_checkout');
  const actualRoot = await realpath(root);
  for (const relative of ['.vercel', 'apps/api/.vercel', 'apps/web/.vercel']) {
    const target = resolve(root, relative);
    if (!target.startsWith(`${root}${sep}`)) fail('vercel_cleanup_path_outside_checkout');
    let actual;
    try { actual = await realpath(target); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (!actual.startsWith(`${actualRoot}${sep}`)) fail('vercel_cleanup_path_outside_checkout');
    await rm(target, { force: true, recursive: true });
  }
}

export async function inspectVercelBuildArtifacts(env, { component = 'api', expectedValues, sourceDatabaseUrl, cwd = process.cwd() } = {}) {
  const report = { scope: 'local-vercel-build-artifacts', readOnly: true, complete: false, processEnvironmentObserved: false, outputs: [] };
  try {
    const root = resolve(cwd);
    if (!['api', 'web'].includes(component) || env.GITHUB_ACTIONS !== 'true' || !env.GITHUB_WORKSPACE || resolve(env.GITHUB_WORKSPACE) !== root) fail('artifact_capture_requires_github_checkout');
    const expected = expectedValues ?? Object.fromEntries([...mutableKeys].filter((key) => typeof env[key] === 'string').map((key) => [key, env[key]]));
    const keys = Object.keys(expected);
    if (!keys.length || keys.some((key) => !mutableKeys.has(key) || typeof expected[key] !== 'string') || (component === 'api' && !(expected.ALCIDE_DATABASE_URL !== undefined ? expected.ALCIDE_DATABASE_URL : expected.DATABASE_URL))) fail('artifact_expected_configuration_required');
    const projectId = component === 'api' ? env.VERCEL_API_PROJECT_ID : env.VERCEL_WEB_PROJECT_ID;
    const actualRoot = await realpath(root);
    const confined = async (path) => {
      const actual = await realpath(path);
      if (!actual.startsWith(`${actualRoot}${sep}`)) fail('artifact_path_outside_checkout');
      return actual;
    };
    const privateJson = async (path) => {
      try {
        await confined(path);
        const metadata = await lstat(path);
        if (metadata.size > 2 * 1024 * 1024) fail('artifact_json_limit_exceeded');
        return JSON.parse(await readFile(path, 'utf8'));
      } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    };
    const canonicalDatabase = (value) => {
      try { return directSourceUrl(value).value; } catch { return null; }
    };
    const expectedDatabaseValue = expected.ALCIDE_DATABASE_URL !== undefined ? expected.ALCIDE_DATABASE_URL : expected.DATABASE_URL;
    const expectedDatabase = expectedDatabaseValue ? canonicalDatabase(expectedDatabaseValue) : null;
    const sourceDatabase = sourceDatabaseUrl ? canonicalDatabase(sourceDatabaseUrl) : null;
    report.repositoryLinkConfigurationPresent = Boolean(await privateJson(join(root, '.vercel/repo.json')));
    let scannedFiles = 0; let scannedBytes = 0;
    for (const cache of ['.vercel', 'apps/api/.vercel', 'apps/web/.vercel']) {
      const outputPath = join(root, cache, 'output');
      try { await confined(outputPath); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
      const project = await privateJson(join(root, cache, 'project.json'));
      const manifest = await privateJson(join(outputPath, 'builds.json'));
      const output = { location: `${cache}/output`, projectConfigurationPresent: Boolean(project),
        projectIdMatches: Boolean(project && project.projectId === projectId),
        projectRootDirectoryMatches: Boolean(project && project.settings?.rootDirectory === `apps/${component}`),
        productionBuildTarget: manifest?.target === 'production', cliVersionMatches: manifest?.cliVersion === '54.17.2',
        functionConfigurations: 0, functionsWithEnvironmentOverrides: 0, conflictingOverrideKeys: [],
        pulledEnvironmentPresent: false, pulledEnvironmentComparedKeys: [], pulledEnvironmentMismatchedKeys: [],
        filesWithDatabaseEnvironmentReference: 0, filesWithApplicationDatabaseEnvironmentReference: 0, databaseLiterals: { expected: 0, source: 0, other: 0 },
      };
      try {
        const pulledPath = join(root, cache, '.env.production.local');
        await confined(pulledPath);
        if ((await lstat(pulledPath)).size > 2 * 1024 * 1024) fail('artifact_environment_limit_exceeded');
        const pulled = require('dotenv').parse(await readFile(pulledPath, 'utf8'));
        output.pulledEnvironmentPresent = true;
        output.pulledEnvironmentComparedKeys = keys.filter((key) => Object.hasOwn(pulled, key));
        output.pulledEnvironmentMismatchedKeys = output.pulledEnvironmentComparedKeys.filter((key) => pulled[key] !== expected[key]);
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      const conflicts = new Set();
      const visit = async (directory, depth = 0) => {
        if (depth > 30) fail('artifact_directory_limit_exceeded');
        await confined(directory);
        for (const entry of await readdir(directory, { withFileTypes: true })) {
          if (++scannedFiles > 20_000) fail('artifact_file_limit_exceeded');
          if (entry.isSymbolicLink() || entry.name === 'node_modules') continue;
          const path = join(directory, entry.name);
          if (entry.isDirectory()) { await visit(path, depth + 1); continue; }
          if (!entry.isFile()) continue;
          if (entry.name === '.vc-config.json') {
            const configuration = await privateJson(path);
            output.functionConfigurations += 1;
            if (configuration?.environment && typeof configuration.environment === 'object') {
              output.functionsWithEnvironmentOverrides += 1;
              for (const key of keys) if (Object.hasOwn(configuration.environment, key) && configuration.environment[key] !== expected[key]) conflicts.add(key);
            }
            continue;
          }
          if (!/\.(?:[cm]?js|ts)$/.test(entry.name)) continue;
          const metadata = await lstat(path);
          if (metadata.size > 2 * 1024 * 1024) { output.largeCodeFilesSkipped = (output.largeCodeFilesSkipped ?? 0) + 1; continue; }
          scannedBytes += metadata.size;
          if (scannedBytes > 32 * 1024 * 1024) fail('artifact_code_limit_exceeded');
          await confined(path);
          const code = await readFile(path, 'utf8');
          if (/process\s*\.\s*env\s*(?:\.\s*(?:ALCIDE_)?DATABASE_URL|\[\s*['"](?:ALCIDE_)?DATABASE_URL['"]\s*\])/.test(code)) output.filesWithDatabaseEnvironmentReference += 1;
          if (/process\s*\.\s*env\s*(?:\.\s*ALCIDE_DATABASE_URL|\[\s*['"]ALCIDE_DATABASE_URL['"]\s*\])/.test(code)) output.filesWithApplicationDatabaseEnvironmentReference += 1;
          for (const literal of code.match(/postgres(?:ql)?:\/\/[^\s"'`\\<>),}]+/gi) ?? []) {
            const canonical = canonicalDatabase(literal);
            const type = canonical && canonical === expectedDatabase ? 'expected' : canonical && canonical === sourceDatabase ? 'source' : 'other';
            output.databaseLiterals[type] += 1;
          }
        }
      };
      try { await visit(join(outputPath, 'functions')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      output.conflictingOverrideKeys = [...conflicts].sort();
      report.outputs.push(output);
    }
    report.component = component; report.expectedKeysCompared = keys;
    report.complete = report.outputs.length > 0;
    report.environmentOverridesConsistent = report.outputs.every((output) => output.conflictingOverrideKeys.length === 0);
    report.onlyOneOutputDirectory = report.outputs.length === 1;
    report.scannedFiles = scannedFiles; report.scannedCodeBytes = scannedBytes;
    if (!report.complete) report.reason = 'build_output_not_found';
  } catch (error) { report.reason = error instanceof ReleaseError ? error.message : 'private_artifact_diagnostics_required'; }
  return report;
}

// Build Output API: environment is a Node.js Function config property. It is
// intentionally not added to Edge configs, which use envVarsInUse instead.
export async function bindVercelFunctionEnvironment(env, { component = 'api', expectedValues, cwd = process.cwd() } = {}) {
  const root = resolve(cwd);
  if (!['api', 'web'].includes(component) || env.GITHUB_ACTIONS !== 'true' || !env.GITHUB_WORKSPACE || resolve(env.GITHUB_WORKSPACE) !== root) fail('function_binding_requires_github_checkout');
  const keys = Object.keys(expectedValues ?? {});
  if (!keys.length || keys.some((key) => !mutableKeys.has(key) || typeof expectedValues[key] !== 'string') || (component === 'api' && !(expectedValues.ALCIDE_DATABASE_URL !== undefined ? expectedValues.ALCIDE_DATABASE_URL : expectedValues.DATABASE_URL))) fail('function_binding_expected_values_required');
  const projectId = component === 'api' ? env.VERCEL_API_PROJECT_ID : env.VERCEL_WEB_PROJECT_ID;
  if (!projectId) fail('function_binding_project_required');
  const actualRoot = await realpath(root);
  const confined = async (path, boundary = actualRoot) => {
    const actual = await realpath(path);
    if (!actual.startsWith(`${boundary}${sep}`)) fail('function_binding_path_outside_checkout');
    return actual;
  };
  const regularJson = async (path) => {
    await confined(path);
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > 2 * 1024 * 1024) fail('function_binding_invalid_config_file');
    try { return JSON.parse(await readFile(path, 'utf8')); } catch { fail('function_binding_invalid_config_json'); }
  };
  const outputs = [];
  for (const cache of ['.vercel', 'apps/api/.vercel', 'apps/web/.vercel']) {
    const outputPath = join(root, cache, 'output');
    try {
      await confined(outputPath);
      const metadata = await lstat(outputPath);
      if (!metadata.isDirectory() || metadata.isSymbolicLink()) fail('function_binding_invalid_output_directory');
      outputs.push({ cache, outputPath });
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (outputs.length !== 1) fail('function_binding_single_active_output_required');
  const { cache, outputPath } = outputs[0];
  const project = await regularJson(join(root, cache, 'project.json'));
  if (project.projectId !== projectId || project.settings?.rootDirectory !== `apps/${component}`) fail('function_binding_project_mismatch');
  const manifest = await regularJson(join(outputPath, 'builds.json'));
  if (manifest.target !== 'production') fail('function_binding_production_build_required');
  const functionsPath = join(outputPath, 'functions');
  const actualFunctions = await confined(functionsPath);
  if ((await lstat(functionsPath)).isSymbolicLink()) fail('function_binding_invalid_functions_directory');
  const canonicalFunctions = new Set(); const aliases = []; const changes = [];
  let entries = 0; let edgeSkippedCount = 0;
  const visit = async (directory, depth = 0) => {
    if (depth > 25) fail('function_binding_directory_limit_exceeded');
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (++entries > 20_000) fail('function_binding_file_limit_exceeded');
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        aliases.push(await confined(path, actualFunctions));
        continue;
      }
      if (!entry.isDirectory()) continue;
      await confined(path, actualFunctions);
      if (!entry.name.endsWith('.func')) { await visit(path, depth + 1); continue; }
      const actualFunction = await realpath(path);
      canonicalFunctions.add(actualFunction);
      const configPath = join(path, '.vc-config.json');
      const configuration = await regularJson(configPath);
      if (configuration.runtime === 'edge') { edgeSkippedCount += 1; continue; }
      if (!/^nodejs\d+\.x$/.test(configuration.runtime ?? '')) fail('function_binding_unsupported_runtime');
      if (configuration.environment !== undefined && (configuration.environment === null || typeof configuration.environment !== 'object' || Array.isArray(configuration.environment))) fail('function_binding_invalid_environment');
      changes.push({ path: configPath, configuration: { ...configuration, environment: { ...configuration.environment, ...expectedValues } } });
    }
  };
  await visit(functionsPath);
  if (aliases.some((target) => !canonicalFunctions.has(target))) fail('function_binding_alias_target_not_selected');
  if (component === 'api' && changes.length === 0) fail('function_binding_node_function_required');
  for (const change of changes) {
    const temporary = `${change.path}.release-${randomBytes(8).toString('hex')}.tmp`;
    try {
      await writeFile(temporary, `${JSON.stringify(change.configuration, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
      await rename(temporary, change.path);
    } finally { await unlink(temporary).catch(() => undefined); }
    const copied = await regularJson(change.path);
    if (keys.some((key) => copied.environment?.[key] !== expectedValues[key])) fail('function_binding_readback_mismatch');
  }
  return { complete: true, selectedOutput: `${cache}/output`, expectedProjectMatches: true, expectedRootDirectoryMatches: true,
    nodeBoundCount: changes.length, edgeSkippedCount, internalAliasesSkippedCount: aliases.length, verifiedKeys: keys, readbackVerified: true };
}

export async function deployClosedProduction(env, configuration, provider, { bootstrap = runAdminBootstrap, command = privateCommand, health = checkReleaseHealth,
  verifyConfiguration = verifyReleaseConfiguration, artifactInspector = inspectVercelBuildArtifacts, functionEnvironmentBinder = bindVercelFunctionEnvironment,
  oauthConfiguration = checkWebOAuthConfiguration,
  selectedAdminId = readSelectedAdminId, denied = checkUnauthenticatedApiDenied, cleanup = () => cleanupVercelCheckout(env) } = {}) {
  const undo = [];
  const previous = [];
  const releaseValuesByProject = new Map();
  let failedStage = 'api_reference';
  const cli = (project, args, action = args[0]) => command('npx', ['--yes', 'vercel@54.17.2', ...args, '--token', env.VERCEL_TOKEN], { ...env, ...releaseValuesByProject.get(project), VERCEL_PROJECT_ID: project, VERCEL_TELEMETRY_DISABLED: '1', VERCEL_FORCE_BUILD: '1', APP_REVISION: env.RELEASE_REVISION }, 1_200_000,
    { stage: `${project === env.VERCEL_API_PROJECT_ID ? 'api' : 'web'}_${action}` });
  const urls = [];
  const buildArtifactDiagnostics = {};
  let bootstrapResult;
  let webOAuthConfiguration;
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
      { DATABASE_URL: newDatabase, ALCIDE_DATABASE_URL: newDatabase, PRODUCTION_ACCESS_MODE: 'admin-only', ADMIN_EMAILS: env.BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_USER_ID: adminId, APP_REVISION: env.RELEASE_REVISION, FRONTEND_URL: 'https://www.alcideai.fr' },
      { PRODUCTION_ACCESS_MODE: 'admin-only', ADMIN_EMAILS: env.BOOTSTRAP_ADMIN_EMAIL, APP_REVISION: env.RELEASE_REVISION, API_URL: 'https://ai-sport-api.vercel.app', NEXT_PUBLIC_API_URL: 'https://ai-sport-api.vercel.app', AUTH_URL: 'https://www.alcideai.fr', NEXTAUTH_URL: 'https://www.alcideai.fr' },
    ];
    for (const [index, project] of [env.VERCEL_API_PROJECT_ID, env.VERCEL_WEB_PROJECT_ID].entries()) {
      const component = index === 0 ? 'api' : 'web';
      for (const [key, value] of Object.entries(values[index])) {
        failedStage = `${component}_env_${key}`;
        await provider.replace(project, index === 0 ? configuration.api[key] : configuration.web[key], key, value, undo);
      }
      failedStage = `${component}_env_readback`;
      await verifyConfiguration(project, values[index], provider);
      releaseValuesByProject.set(project, values[index]);
      // Each project must get an independent pull/build cache.
      failedStage = `${component}_cleanup`;
      await cleanup();
      failedStage = `${component}_pull`;
      cli(project, ['pull', '--yes', '--environment=production']);
      failedStage = `${component}_build`;
      cli(project, ['build', '--prod']);
      failedStage = `${component}_function_environment`;
      const functionEnvironmentBinding = await functionEnvironmentBinder({ ...env, ...values[index] }, { component, expectedValues: values[index] });
      buildArtifactDiagnostics[component] = { functionEnvironmentBinding };
      failedStage = `${component}_build_artifacts`;
      buildArtifactDiagnostics[component] = { ...await artifactInspector({ ...env, ...values[index] }, { component, expectedValues: values[index], sourceDatabaseUrl: configuration.source }), functionEnvironmentBinding };
      failedStage = `${component}_deploy`;
      // Bare --env KEY makes the pinned CLI read the value from child env.
      // Secret values never become command arguments or persisted CLI logs.
      const output = cli(project, ['deploy', '--prebuilt', '--prod', '--skip-domain',
        ...Object.keys(values[index]).flatMap((key) => ['--env', key]), '--meta', `sourceRevision=${env.RELEASE_REVISION}`]);
      const url = output.trim().split(/\r?\n/).at(-1)?.trim();
      if (!/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(url ?? '')) fail('invalid_created_deployment_url');
      urls.push(url);
      let bypassSecret;
      let temporaryBypass;
      if (index === 1) {
        bypassSecret = env.VERCEL_AUTOMATION_BYPASS_SECRET;
        if (!bypassSecret) {
          failedStage = 'web_automation_bypass_create';
          temporaryBypass = await provider.temporaryAutomationBypass(project, undo);
          bypassSecret = temporaryBypass.secret;
        }
      }
      failedStage = `${component}_health`;
      await health(`${url}${index === 0 ? '/health/ready' : '/api/health'}`, { service: index === 0 ? 'alcide-api' : 'alcide-web', status: index === 0 ? 'ready' : 'ok', revision: env.RELEASE_REVISION }, { bypassSecret });
      if (index === 0) { failedStage = 'api_denied_probe'; await denied(url); }
      else {
        failedStage = 'web_oauth_configuration';
        webOAuthConfiguration = await oauthConfiguration(url, { bypassSecret });
        if (temporaryBypass) { failedStage = 'web_automation_bypass_revoke'; await temporaryBypass.revoke(); }
      }
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
    return { complete: true, access: 'admin-only', revision: env.RELEASE_REVISION, reuseExistingRequested: env.BOOTSTRAP_REUSE_EXISTING === 'verified-admin-copy', deploymentUrls: urls, previousDeploymentUrls: previous, unauthenticatedProtectedApiStatus: 401, bootstrap: bootstrapResult, buildArtifactDiagnostics, webOAuthConfiguration };
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
      buildArtifactDiagnostics,
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
    report.configuration = configuration.checks; report.sourceDirectDerived = configuration.sourceDirectDerived; report.applicationDatabaseOverrideSelected = configuration.applicationOverrideSelected;
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
