import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Client, inventory, encryptBackup, decryptBackup, assertRestoreTarget, assertRestoredCounts, fileHash, migrationFingerprint } from './db-operations.mjs';
import { readCandidateLineage, inspectDatabaseMigrationLineage } from './db-migration-lineage.mjs';
import { applyAdditiveLiveUpdate, verifyLiveAdminProduction, readAdditiveUpdatePlan, pinnedPilotMigration, safeReleaseFailure } from './production-admin-release.mjs';

// No URL, provider key, release confirmation or production target is accepted.
const root = fileURLToPath(new URL('../', import.meta.url));
const runId = randomUUID();
const container = `alcide-closed-update-${runId}`;
const output = resolve(root, 'tmp', 'pilot-closed-update', runId);
const password = randomBytes(24).toString('hex');
const key = randomBytes(32).toString('base64');
const admin = randomUUID(), workout = randomUUID(), program = randomUUID();
const email = 'synthetic-admin@closed-update.invalid';
const environment = {};
for (const name of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'COMSPEC', 'ComSpec', 'TEMP', 'TMP', 'USERPROFILE', 'HOME', 'LOCALAPPDATA', 'APPDATA', 'PATHEXT']) if (process.env[name]) environment[name] = process.env[name];
Object.assign(environment, { NODE_ENV: 'test', CI: 'true', TZ: 'UTC' });
const proof = { runId, performedAt: new Date().toISOString(), complete: false, scope: 'synthetic local PostgreSQL encrypted-copy update rehearsal', scenarios: [] };
let created = false, phase = 'initialization';

function command(tool, args, { binary = false, ...options } = {}) {
  const result = spawnSync(tool, args, { cwd: root, env: environment, encoding: binary ? undefined : 'utf8', windowsHide: true, timeout: 180_000, maxBuffer: 50 * 1024 * 1024, ...options });
  if (result.status !== 0) throw new Error(`Local qualification command failed: ${tool}`);
  return binary ? result.stdout : result.stdout.trim();
}
async function fingerprint() {
  const hash = createHash('sha256');
  const files = command('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'apps/api/src', 'apps/api/tests', 'apps/api/drizzle', 'packages/shared', 'scripts/production-admin-release.mjs', 'scripts/production-admin-release.test.mjs', 'scripts/qualify-pilot-closed-update.mjs', 'pnpm-lock.yaml']).split(/\r?\n/).filter(Boolean).sort();
  for (const file of files) { hash.update(file); hash.update('\0'); hash.update(await readFile(resolve(root, file))); hash.update('\0'); }
  return hash.digest('hex');
}
async function connected(url) { const client = new Client({ connectionString: url, connectionTimeoutMillis: 2000 }); await client.connect(); return client; }
function releaseInput(url) {
  const policy = { PRODUCTION_ACCESS_MODE: { value: 'admin-only' }, ADMIN_EMAILS: { value: email } };
  return { env: { RELEASE_MODE: 'update', UPDATE_CONFIRM: 'preserve-live-admin-production', TARGET_DATABASE_NAME: new URL(url).pathname.slice(1), BOOTSTRAP_ADMIN_EMAIL: email },
    configuration: { source: url, applicationOverrideSelected: true, api: { ...policy, ALCIDE_DATABASE_URL: { value: url }, BOOTSTRAP_ADMIN_USER_ID: { value: admin } }, web: { ...policy } } };
}
function readiness(url) {
  const moduleUrl = pathToFileURL(resolve(root, 'apps/api/src/lib/readiness.ts')).href;
  const code = `const {checkReadiness}=await import(${JSON.stringify(moduleUrl)});console.log(JSON.stringify(await checkReadiness()));`;
  return JSON.parse(command(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', code], { cwd: resolve(root, 'apps/api'), env: { ...environment, DATABASE_URL: url, OPENAI_API_KEY: 'synthetic-key-readiness-check-only-no-provider-call' } }));
}
async function seed(client, prefix) {
  await client.query('INSERT INTO users(id,email,name) VALUES ($1,$2,$3)', [admin, email, 'Synthetic preserved admin']);
  await client.query("INSERT INTO accounts(user_id,type,provider,provider_account_id) VALUES ($1,'oidc','google','synthetic-preserved-google-subject')", [admin]);
  await client.query("INSERT INTO workouts(id,user_id,title,sport,difficulty,duration_minutes,data) VALUES ($1,$2,'Synthetic preserved workout','course','beginner',20,$3)", [workout, admin, JSON.stringify({ exercises: [], marker: 'preserved-history-fixture' })]);
  await client.query("INSERT INTO training_programs(id,user_id,title,sport,difficulty,weeks_count,sessions_per_week,session_duration_minutes,data) VALUES ($1,$2,'Synthetic preserved program','course','beginner',2,2,20,$3)", [program, admin, JSON.stringify({ weeks: [], marker: 'preserved-program-fixture' })]);
  await client.query("INSERT INTO session_logs(user_id,source_type,workout_id,title,sport,difficulty,planned_duration_minutes,completed_at,duration_seconds,perceived_effort,feedback) VALUES ($1,'workout',$2,'Synthetic preserved log','course','beginner',20,now(),1200,4,'good')", [admin, workout]);
  await client.query('INSERT INTO user_settings(user_id) VALUES ($1)', [admin]);
  await client.query('INSERT INTO generation_quotas(user_id,used_count) VALUES ($1,2)', [admin]);
  await client.query("INSERT INTO generation_daily_budgets(scope,day,attempts,reserved_tokens,input_tokens,output_tokens) VALUES ('global','2026-10-30',1,100,40,60)");
  await client.query('INSERT INTO billing_accounts(user_id) VALUES ($1)', [admin]);
  await client.query("INSERT INTO billing_credit_grants(user_id,source_key,amount,remaining) VALUES ($1,'admin:synthetic-preserved-grant',3,2)", [admin]);
  if (prefix === 15) await client.query("INSERT INTO incidents(fingerprint,source,severity,code,route,method,status_code) VALUES ('synthetic-preserved-incident','api','error','SYNTHETIC_ERROR','/synthetic','GET',500)");
}

try {
  await mkdir(output, { recursive: true });
  proof.revision = command('git', ['rev-parse', 'HEAD']);
  proof.workingTreeModified = command('git', ['status', '--porcelain']).length > 0;
  proof.candidateFingerprint = await fingerprint();
  proof.migrationFingerprint = await migrationFingerprint();
  const candidates = await readCandidateLineage();
  assert.equal(candidates.length, 16);
  assert.equal(candidates[15].hash, pinnedPilotMigration.hash);
  command('docker', ['image', 'inspect', 'postgres:16-alpine']);
  command('docker', ['run', '--detach', '--pull=never', '--name', container, '--label', 'alcide.purpose=pilot-closed-update', '--publish', '127.0.0.1:0:5432', '--env', 'POSTGRES_USER=alcide_test', '--env', 'POSTGRES_PASSWORD', '--env', 'POSTGRES_DB=alcide_closed_update_control_test', 'postgres:16-alpine'], { env: { ...environment, POSTGRES_PASSWORD: password } });
  created = true;
  const published = command('docker', ['port', container, '5432/tcp']);
  assert.match(published, /^127\.0\.0\.1:\d+$/);
  const base = `postgresql://alcide_test:${password}@${published}/`;
  let control;
  for (let index = 0; ; index++) { try { control = await connected(base + 'alcide_closed_update_control_test'); break; } catch { if (index >= 30) throw new Error('Dedicated local PostgreSQL unavailable'); await new Promise((done) => setTimeout(done, 500)); } }
  try {
    proof.postgresql = { version: (await control.query('show server_version')).rows[0].server_version, fsync: (await control.query('show fsync')).rows[0].fsync };
    assert.equal(proof.postgresql.fsync, 'on');
    for (const prefix of [14, 15]) {
      phase = `prefix-${prefix}-create-source`;
      const name = (kind) => `alcide_closed_update_${kind}_${prefix}_test`;
      for (const kind of ['source', 'copy', 'rollback']) await control.query(`CREATE DATABASE ${name(kind)}`);
      const sourceUrl = base + name('source'), copyUrl = base + name('copy'), rollbackUrl = base + name('rollback');
      const source = await connected(sourceUrl);
      let manifest;
      const dump = resolve(output, `prefix-${prefix}.dump`), archive = `${dump}.enc`, plaintext = `${dump}.restored`;
      try {
        await source.query('CREATE SCHEMA drizzle; CREATE TABLE drizzle.__drizzle_migrations(id serial PRIMARY KEY,hash text NOT NULL,created_at bigint)');
        for (const candidate of candidates.slice(0, prefix)) {
          await source.query('BEGIN');
          for (const sql of (await readFile(new URL(`../apps/api/drizzle/${candidate.tag}.sql`, import.meta.url), 'utf8')).split('--> statement-breakpoint')) if (sql.trim()) await source.query(sql);
          await source.query('INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES ($1,$2)', [candidate.hash, candidate.createdAt]);
          await source.query('COMMIT');
        }
        await seed(source, prefix);
        const before = readiness(sourceUrl);
        assert.equal(before.ready, false); assert.equal(before.checks.database, 'ok'); assert.equal(before.checks.schema, 'missing');
        phase = `prefix-${prefix}-encrypted-snapshot-backup`;
        await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
        const snapshot = (await source.query('SELECT pg_export_snapshot() AS snapshot')).rows[0].snapshot;
        manifest = { formatVersion: 1, encrypted: true, ...await inventory(source), candidateRevision: proof.revision, migrationFingerprint: proof.migrationFingerprint };
        const bytes = command('docker', ['exec', container, 'pg_dump', '--no-password', '--format=custom', '--no-owner', '--no-acl', `--snapshot=${snapshot}`, '--username=alcide_test', `--dbname=${name('source')}`], { binary: true });
        await source.query('COMMIT');
        await writeFile(dump, bytes, { flag: 'wx', mode: 0o600 });
        manifest.dumpSha256 = await fileHash(dump);
        await encryptBackup(dump, archive, key); await unlink(dump);
        manifest.encryptedSha256 = await fileHash(archive);
        assert.notEqual(manifest.dumpSha256, manifest.encryptedSha256);
        await writeFile(`${dump}.manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
        for (const kind of ['copy', 'rollback']) {
          phase = `prefix-${prefix}-restore-${kind}`;
          const targetUrl = base + name(kind), target = await connected(targetUrl);
          try { assertRestoreTarget({ confirmation: 'isolated-empty-database', target: await inventory(target), manifest }); }
          finally { await target.end(); }
          await decryptBackup(archive, plaintext, key);
          try {
            assert.equal(await fileHash(plaintext), manifest.dumpSha256);
            command('docker', ['exec', '--interactive', container, 'pg_restore', '--no-password', '--no-owner', '--no-acl', '--exit-on-error', '--single-transaction', '--username=alcide_test', `--dbname=${name(kind)}`], { input: await readFile(plaintext) });
          } finally { await unlink(plaintext); }
          const restored = await connected(targetUrl);
          try { assertRestoredCounts(manifest, await inventory(restored)); }
          finally { await restored.end(); }
        }
        phase = `prefix-${prefix}-update-copy`;
        const { env, configuration } = releaseInput(copyUrl);
        const verified = await verifyLiveAdminProduction(env, configuration);
        assert.equal(verified.evidence.appliedMigrations, prefix);
        const expected = await readAdditiveUpdatePlan({ compatible: true, appliedMigrations: prefix, matchedPrefix: prefix, pendingMigrations: 16 - prefix });
        const updated = await applyAdditiveLiveUpdate(env, configuration, expected);
        assert.equal(updated.pilotClosed.complete, true);
        assert.equal(updated.fullDataPreserved, true); assert.equal(updated.existingCatalogPreserved, true);
        const after = readiness(copyUrl);
        assert.equal(after.ready, true); assert.equal(after.checks.schema, 'ok');
        assert.equal((await verifyLiveAdminProduction(env, configuration)).evidence.pendingMigrations, 0);
        phase = `prefix-${prefix}-injected-failure-rollback`;
        const rollbackInput = releaseInput(rollbackUrl);
        let injected = false;
        await assert.rejects(applyAdditiveLiveUpdate(rollbackInput.env, rollbackInput.configuration, expected, { clientFactory: (options) => {
          const client = new Client(options), query = client.query.bind(client);
          client.query = (sql, values) => { if (typeof sql === 'string' && sql.startsWith('CREATE TRIGGER pilot_attempts_preserved')) { injected = true; throw new Error('synthetic-local-trigger-failure'); } return query(sql, values); };
          return client;
        } }), /synthetic-local-trigger-failure/);
        assert.equal(injected, true);
        const rolledBack = await connected(rollbackUrl);
        try { assertRestoredCounts(manifest, await inventory(rolledBack)); assert.equal((await inspectDatabaseMigrationLineage(rolledBack)).appliedMigrations, prefix); }
        finally { await rolledBack.end(); }
        assertRestoredCounts(manifest, await inventory(source));
        proof.scenarios.push({ prefix, encryptedBackup: true, archiveSha256: manifest.encryptedSha256, fullRestoreCountsMatch: true,
          updated, readinessBefore: before.checks, readinessAfter: after.checks, injectedFailureRolledBack: true, sourceUnchanged: true, adminOnly: true, providerCalls: 0 });
      } finally { await source.end(); }
    }
  } finally { await control.end(); }
  proof.candidateUnchanged = proof.candidateFingerprint === await fingerprint();
  assert.equal(proof.candidateUnchanged, true);
  proof.complete = true;
} catch (error) {
  proof.failure = { phase, ...safeReleaseFailure(error, 'additive_live_migration') };
  process.exitCode = 1;
} finally {
  if (created) { try { command('docker', ['rm', '--force', '--volumes', container]); proof.cleanup = true; } catch { proof.cleanup = false; proof.complete = false; process.exitCode = 1; } }
  proof.finishedAt = new Date().toISOString();
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'evidence.json'), `${JSON.stringify(proof, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ complete: proof.complete, scenarios: proof.scenarios.length, cleanup: proof.cleanup, evidence: resolve(output, 'evidence.json'), sha256: await fileHash(resolve(output, 'evidence.json')) }));
}
