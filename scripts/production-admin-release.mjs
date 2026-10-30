import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { runAdminBootstrap, targetDatabaseUrl } from './production-admin-bootstrap.mjs';
import { databaseUrl, readDatabaseIdentity, fileHash, migrationFingerprint } from './db-operations.mjs';
import { checkHealth } from './cd-health-check.mjs';

class ReleaseError extends Error {}
const fail = (message) => { throw new ReleaseError(message); };
const production = (item) => !item.gitBranch && (Array.isArray(item.target) ? item.target : [item.target]).includes('production');
const safeKey = (key) => /^[A-Z][A-Z0-9_]+$/.test(key);
const mutableKeys = new Set(['DATABASE_URL', 'PRODUCTION_ACCESS_MODE', 'ADMIN_EMAILS', 'APP_REVISION', 'API_URL', 'NEXT_PUBLIC_API_URL', 'FRONTEND_URL']);

export function validateReleaseInput(env) {
  const mode = env.RELEASE_MODE ?? 'plan';
  if (!['plan', 'rehearse', 'deploy'].includes(mode)) fail('invalid_release_mode');
  if (!/^[a-f0-9]{40}$/.test(env.RELEASE_REVISION ?? '')) fail('immutable_release_revision_required');
  if (!/^[a-z][a-z0-9_]{2,62}$/.test(env.TARGET_DATABASE_NAME ?? '')) fail('explicit_new_database_name_required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.BOOTSTRAP_ADMIN_EMAIL ?? '')) fail('explicit_admin_email_required');
  for (const key of ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_API_PROJECT_ID', 'VERCEL_WEB_PROJECT_ID']) {
    if (!env[key]) fail(`missing_${key.toLowerCase()}`);
  }
  if (mode === 'deploy' && env.BOOTSTRAP_CONFIRM !== 'selective-admin-copy-to-new-database') fail('explicit_bootstrap_confirmation_required');
  if (mode !== 'plan' && Buffer.from(env.BACKUP_ENCRYPTION_KEY ?? '', 'base64').length !== 32) fail('backup_encryption_key_required');
  return mode;
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
    await this.request(base, 'POST', { key, value, target: ['production'], type: original?.type ?? 'encrypted' });
  }
}

export async function inspectConfiguration(env, provider) {
  const apiKeys = ['DATABASE_URL', 'SERVICE_SECRET', 'AUTH_SECRET', 'PRODUCTION_ACCESS_MODE', 'ADMIN_EMAILS', 'APP_REVISION', 'FRONTEND_URL'];
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
export function privateCommand(command, args, env, timeout = 600_000) {
  const result = spawnSync(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout, maxBuffer: 32 * 1024 * 1024 });
  if (result.error || result.status !== 0) fail('private_command_failed');
  return result.stdout;
}
const script = (name, env) => privateCommand(process.execPath, [fileURLToPath(new URL(`./${name}`, import.meta.url))], env);
const pause = (ms) => new Promise((done) => setTimeout(done, ms));

async function rehearse(env, directory, source, identity, bootstrap) {
  const password = randomBytes(32).toString('hex');
  const container = `alcide-admin-rehearsal-${randomBytes(8).toString('hex')}`;
  const dockerEnv = { ...env, POSTGRES_PASSWORD: password };
  let started = false;
  try {
    privateCommand('docker', ['run', '--detach', '--name', container, '--publish', '127.0.0.1::5432', '--env', 'POSTGRES_PASSWORD', '--env', 'POSTGRES_DB=restore_source', `postgres:${identity.databaseMajor}-alpine`], dockerEnv);
    started = true;
    const port = privateCommand('docker', ['port', container, '5432/tcp'], dockerEnv).trim().match(/^127\.0\.0\.1:(\d+)$/)?.[1];
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
    const evidence = { formatVersion: 1, revision: env.RELEASE_REVISION, targetDatabaseName: env.TARGET_DATABASE_NAME,
      sourceIdentity: identity.sourceIdentity, databaseMajor: identity.databaseMajor,
      performedAt: new Date().toISOString(), restoredCountsMatch: true, selectiveCopyVerified: true,
      encryptedSha256: await fileHash(`${env.BACKUP_FILE}.enc`), migrationFingerprint: JSON.parse(await readFile(`${env.BACKUP_FILE}.manifest.json`, 'utf8')).migrationFingerprint };
    await writeFile(resolve(directory, 'rehearsal.json'), JSON.stringify(evidence), { flag: 'wx', mode: 0o600 });
    return evidence;
  } finally {
    if (started) privateCommand('docker', ['rm', '--force', '--volumes', container], dockerEnv);
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

export async function deployClosedProduction(env, configuration, provider, { bootstrap = runAdminBootstrap, command = privateCommand, health = checkHealth,
  denied = checkUnauthenticatedApiDenied, cleanup = () => rm(resolve('.vercel'), { force: true, recursive: true }) } = {}) {
  const undo = [];
  const previous = await Promise.all([provider.previousDeployment(env.VERCEL_API_PROJECT_ID), provider.previousDeployment(env.VERCEL_WEB_PROJECT_ID)]);
  const cli = (project, args) => command('npx', ['--yes', 'vercel@54.17.2', ...args, '--token', env.VERCEL_TOKEN], { ...env, VERCEL_PROJECT_ID: project, VERCEL_TELEMETRY_DISABLED: '1', VERCEL_FORCE_BUILD: '1', APP_REVISION: env.RELEASE_REVISION }, 1_200_000);
  const urls = [];
  let bootstrapResult;
  let promotionAttempted = false;
  try {
    bootstrapResult = await bootstrap({ ...env, SOURCE_DATABASE_URL: configuration.source, BOOTSTRAP_MODE: 'apply' });
    if (!bootstrapResult.complete || !bootstrapResult.ready || !bootstrapResult.adminCopyVerified) fail('production_admin_copy_failed');
    const values = [
      { DATABASE_URL: targetDatabaseUrl(configuration.source, env.TARGET_DATABASE_NAME), PRODUCTION_ACCESS_MODE: 'admin-only', ADMIN_EMAILS: env.BOOTSTRAP_ADMIN_EMAIL, APP_REVISION: env.RELEASE_REVISION, FRONTEND_URL: 'https://www.alcideai.fr' },
      { PRODUCTION_ACCESS_MODE: 'admin-only', ADMIN_EMAILS: env.BOOTSTRAP_ADMIN_EMAIL, APP_REVISION: env.RELEASE_REVISION, API_URL: 'https://ai-sport-api.vercel.app', NEXT_PUBLIC_API_URL: 'https://ai-sport-api.vercel.app' },
    ];
    for (const [index, project] of [env.VERCEL_API_PROJECT_ID, env.VERCEL_WEB_PROJECT_ID].entries()) {
      for (const [key, value] of Object.entries(values[index])) await provider.replace(project, index === 0 ? configuration.api[key] : configuration.web[key], key, value, undo);
      // Each project must get an independent pull/build cache.
      await cleanup();
      cli(project, ['pull', '--yes', '--environment=production']);
      cli(project, ['build', '--prod']);
      const output = cli(project, ['deploy', '--prebuilt', '--prod', '--skip-domain', '--meta', `sourceRevision=${env.RELEASE_REVISION}`]);
      const url = output.trim().split(/\r?\n/).at(-1)?.trim();
      if (!/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(url ?? '')) fail('invalid_created_deployment_url');
      urls.push(url);
      await health(`${url}${index === 0 ? '/health/ready' : '/api/health'}`, { service: index === 0 ? 'alcide-api' : 'alcide-web', status: index === 0 ? 'ready' : 'ok', revision: env.RELEASE_REVISION }, { bypassSecret: env.VERCEL_AUTOMATION_BYPASS_SECRET });
      if (index === 0) await denied(url, { bypassSecret: env.VERCEL_AUTOMATION_BYPASS_SECRET });
    }
    for (const [index, project] of [env.VERCEL_API_PROJECT_ID, env.VERCEL_WEB_PROJECT_ID].entries()) {
      promotionAttempted = true;
      cli(project, ['promote', urls[index], '--yes']);
      await health(index === 0 ? 'https://ai-sport-api.vercel.app/health/ready' : 'https://www.alcideai.fr/api/health', { service: index === 0 ? 'alcide-api' : 'alcide-web', status: index === 0 ? 'ready' : 'ok', revision: env.RELEASE_REVISION });
      if (index === 0) await denied('https://ai-sport-api.vercel.app');
    }
    return { complete: true, access: 'admin-only', revision: env.RELEASE_REVISION, deploymentUrls: urls, previousDeploymentUrls: previous, unauthenticatedProtectedApiStatus: 401, bootstrap: bootstrapResult };
  } catch {
    let rollbackComplete = true;
    if (promotionAttempted) {
      // Roll back Web before API to stop new callers using the new API policy.
      for (const index of [1, 0]) {
        try { cli([env.VERCEL_API_PROJECT_ID, env.VERCEL_WEB_PROJECT_ID][index], ['promote', previous[index], '--yes']); } catch { rollbackComplete = false; }
      }
    }
    for (const compensate of undo.reverse()) { try { await compensate(); } catch { rollbackComplete = false; } }
    return { complete: false, reason: rollbackComplete ? 'release_failed_rollback_completed' : 'release_failed_manual_rollback_required', rollbackComplete,
      newDatabaseRetained: bootstrapResult?.targetCreated === true, previousDeploymentUrls: previous };
  } finally { await cleanup(); }
}

export async function runProductionAdminRelease(input, { provider, bootstrap = runAdminBootstrap, fetcher = fetch } = {}) {
  const report = { performedAt: new Date().toISOString(), scope: 'closed-admin-technical-release', complete: false };
  try {
    const mode = validateReleaseInput(input);
    report.mode = mode; report.revision = input.RELEASE_REVISION;
    const env = { ...input };
    const client = provider ?? new VercelProduction(env, fetcher);
    if (mode === 'deploy') report.ci = await requireSuccessfulCi(env, fetcher);
    const configuration = await inspectConfiguration(env, client);
    report.configuration = configuration.checks; report.sourceDirectDerived = configuration.sourceDirectDerived;
    report.bootstrap = await bootstrap({ ...env, SOURCE_DATABASE_URL: configuration.source, BOOTSTRAP_MODE: 'plan' });
    if (!report.bootstrap.complete || !report.bootstrap.ready || !configuration.ready) { report.reason = 'production_preconditions_failed'; return report; }
    if (mode === 'plan') { report.complete = true; return report; }
    const directory = resolve(env.RELEASE_DIRECTORY ?? resolve(env.RUNNER_TEMP ?? '.', 'alcide-admin-release'));
    await mkdir(directory, { recursive: true, mode: 0o700 });
    env.BACKUP_FILE = resolve(directory, 'release.dump');
    const phase = env.RELEASE_PHASE ?? 'prepare';
    if (!['prepare', 'release'].includes(phase) || (mode !== 'deploy' && phase !== 'prepare')) fail('invalid_release_phase');
    if (phase === 'prepare') {
      const identity = await readDatabaseIdentity(configuration.source);
      if (![16, 17, 18].includes(identity.databaseMajor)) fail('unsupported_postgresql_major');
      env.PG_TOOLS_DOCKER_IMAGE = `postgres:${identity.databaseMajor}-alpine`;
      script('db-backup.mjs', { ...env, DATABASE_URL: configuration.source });
      report.rehearsal = await rehearse(env, directory, configuration.source, identity, bootstrap);
      report.complete = true; report.phase = 'prepared'; return report;
    }
    await verifyPreparedBackup(env, directory, configuration.source);
    Object.assign(report, await deployClosedProduction(env, configuration, client, { bootstrap }));
    return report;
  } catch (error) {
    report.reason = error instanceof ReleaseError ? error.message : 'private_diagnostics_required';
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
