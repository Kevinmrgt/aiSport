import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Always create a new local disposable database. No supplied DATABASE_URL is used.
const root = fileURLToPath(new URL('../', import.meta.url));
const requireApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { Client } = requireApi('pg');
const runId = randomUUID();
const container = `alcide-pilot-qualification-${runId}`;
const output = resolve(root, 'tmp', 'pilot-qualification', runId);
const databaseName = 'alcide_pilot_qualification_test';
const password = randomBytes(24).toString('hex');
const environment = {};
// Do not copy production credentials, NODE_OPTIONS, or application switches.
for (const key of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'COMSPEC', 'ComSpec', 'TEMP', 'TMP', 'USERPROFILE', 'HOME', 'LOCALAPPDATA', 'APPDATA', 'PATHEXT']) {
  if (process.env[key]) environment[key] = process.env[key];
}
Object.assign(environment, { NODE_ENV: 'test', CI: 'true', TZ: 'UTC' });
const evidence = { runId, performedAt: new Date().toISOString(), environment: 'disposable local PostgreSQL 16; synthetic fixtures; provider networking blocked', complete: false, phases: [] };
let created = false;

function command(commandName, args, options = {}) {
  const result = spawnSync(commandName, args, { cwd: root, env: environment, encoding: 'utf8', windowsHide: true, timeout: 180_000, maxBuffer: 20 * 1024 * 1024, ...options });
  if (result.status !== 0) throw new Error(`Qualification command failed: ${commandName} (exit ${result.status ?? 'unavailable'})`);
  return result.stdout.trim();
}

async function candidateFingerprint() {
  const files = command('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'apps/api/src', 'apps/api/tests', 'apps/api/drizzle', 'packages/shared', 'scripts/qualify-pilot-protections.mjs', 'pnpm-lock.yaml']).split(/\r?\n/).filter(Boolean).sort();
  const hash = createHash('sha256');
  for (const file of files) { hash.update(file); hash.update('\0'); hash.update(await readFile(resolve(root, file))); hash.update('\0'); }
  return hash.digest('hex');
}

try {
  await mkdir(output, { recursive: true });
  evidence.revision = command('git', ['rev-parse', 'HEAD']);
  evidence.workingTreeModified = command('git', ['status', '--porcelain']).length > 0;
  evidence.candidateFingerprint = await candidateFingerprint();
  const { migrationFingerprint } = await import('./db-operations.mjs');
  evidence.migrationFingerprint = await migrationFingerprint();
  command('docker', ['image', 'inspect', 'postgres:16-alpine']);
  command('docker', ['run', '--detach', '--pull=never', '--name', container, '--label', 'alcide.purpose=pilot-qualification', '--publish', '127.0.0.1:0:5432', '--env', 'POSTGRES_USER=alcide_test', '--env', 'POSTGRES_PASSWORD', '--env', `POSTGRES_DB=${databaseName}`, 'postgres:16-alpine'], { env: { ...environment, POSTGRES_PASSWORD: password } });
  created = true;
  const published = command('docker', ['port', container, '5432/tcp']);
  if (!/^127\.0\.0\.1:\d+$/.test(published)) throw new Error('Non-loopback PostgreSQL binding refused');
  const connectionString = `postgresql://alcide_test:${password}@${published}/${databaseName}`;
  Object.assign(environment, { DATABASE_URL: connectionString, TEST_DATABASE_URL: connectionString });
  for (let attempt = 0; ; attempt++) {
    const probe = new Client({ connectionString, connectionTimeoutMillis: 1000 });
    try {
      await probe.connect();
      await probe.query('select 1');
      break;
    } catch {
      if (attempt >= 30) throw new Error('Dedicated PostgreSQL startup failed');
      await new Promise((done) => setTimeout(done, 500));
    } finally {
      await probe.end().catch(() => undefined);
    }
  }
  evidence.phases.push({ name: 'fresh-local-database', passed: true });
  command(process.execPath, [resolve(root, 'scripts/db-migrate-locked.mjs')]);
  evidence.phases.push({ name: 'candidate-migrations', passed: true });
  const migrated = new Client({ connectionString });
  try {
    await migrated.connect();
    const state = (await migrated.query("select (select count(*) from pilot_control)::integer as controls, (select count(*) from pilot_invitations)::integer as invitations, current_setting('server_version') as version, current_setting('fsync') as fsync")).rows[0];
    if (state.controls !== 0 || state.invitations !== 0 || state.fsync !== 'on') throw new Error('Qualification command migrations activated pilot or disabled durability');
    evidence.postgresql = { version: state.version, fsync: state.fsync };
    evidence.phases.push({ name: 'migration-leaves-pilot-closed', passed: true });
  } finally { await migrated.end(); }

  // Guard the real HTTP transports in every Vitest worker and spawned Node process.
  // Individual tests may replace these transports with their synthetic providers.
  const guardPath = resolve(output, 'provider-network-guard.mjs');
  await writeFile(guardPath, `import http from 'node:http';\nimport https from 'node:https';\nimport {syncBuiltinESMExports} from 'node:module';\nconst local = (value) => { const host = String(value).toLowerCase(); if (!['localhost','127.0.0.1','::1','[::1]'].includes(host)) throw new Error('External provider networking disabled during pilot qualification'); };\nconst realFetch = globalThis.fetch;\nglobalThis.fetch = function(input, init) { local(new URL(typeof input === 'string' || input instanceof URL ? input : input.url).hostname); return realFetch(input,init); };\nfor (const transport of [http,https]) for (const key of ['request','get']) { const original = transport[key]; transport[key] = function(input, ...rest) { if (typeof input === 'string' || input instanceof URL) local(new URL(input).hostname); else local(input?.hostname ?? String(input?.host ?? 'localhost').split(':')[0]); return original.call(this,input,...rest); }; }\nsyncBuiltinESMExports();\n`, 'utf8');
  environment.NODE_OPTIONS = `--import=${pathToFileURL(guardPath).href}`;
  const reportPath = resolve(output, 'vitest-results.json');
  const testArguments = process.argv.slice(2);
  if (testArguments.some((value) => !/^tests\/[a-z0-9.-]+\.integration\.test\.ts$/i.test(value))) throw new Error('Only explicit API integration test paths are accepted');
  const vitest = resolve(root, 'apps/api/node_modules/vitest/vitest.mjs');
  evidence.coverageEnabled = testArguments.length === 0;
  const result = spawnSync(process.execPath, [vitest, 'run', '--config', 'vitest.integration.config.ts', ...testArguments, ...(evidence.coverageEnabled ? ['--coverage', '--coverage.reportsDirectory', resolve(output, 'coverage')] : []), '--testTimeout=30000', '--hookTimeout=30000', '--reporter=default', '--reporter=json', '--outputFile', reportPath], { cwd: resolve(root, 'apps/api'), env: environment, encoding: 'utf8', windowsHide: true, timeout: 600_000, maxBuffer: 20 * 1024 * 1024 });
  await writeFile(resolve(output, 'local-diagnostics.log'), `${result.stdout ?? ''}\n${result.stderr ?? ''}`.replace(/postgres(?:ql)?:\/\/[^\s'"]+/g, '[dedicated-database-url]'), 'utf8');
  let report;
  try { report = JSON.parse(await readFile(reportPath, 'utf8')); } catch { throw new Error('Vitest did not emit a qualification report'); }
  evidence.tests = { total: report.numTotalTests, passed: report.numPassedTests, failed: report.numFailedTests, skipped: report.numPendingTests, suites: report.testResults.map((suite) => ({ file: suite.name.replaceAll('\\', '/').replace(root.replaceAll('\\', '/'), ''), status: suite.status, tests: suite.assertionResults.map(({ fullName, status }) => ({ name: fullName, status })) })) };
  evidence.phases.push({ name: 'real-postgresql-integration', passed: result.status === 0 && report.numFailedTests === 0 && report.numPendingTests === 0 && report.numTotalTests > 0 });
  if (!evidence.phases.at(-1).passed) throw new Error('Integration qualification failed or skipped tests');
  evidence.candidateUnchanged = evidence.candidateFingerprint === await candidateFingerprint();
  if (!evidence.candidateUnchanged) throw new Error('Qualification command candidate changed while tests ran');
  evidence.complete = true;
} catch (error) {
  // Never print raw driver errors or provider output.
  evidence.failure = error instanceof Error && /^(Qualification command|Non-loopback|Dedicated PostgreSQL|Vitest did not|Only explicit|Integration qualification)/.test(error.message) ? error.message : 'Qualification setup failed; private local diagnostics required';
  process.exitCode = 1;
} finally {
  if (created) {
    try { command('docker', ['rm', '--force', '--volumes', container]); evidence.cleanup = true; }
    catch { evidence.cleanup = false; evidence.complete = false; process.exitCode = 1; }
  }
  evidence.finishedAt = new Date().toISOString();
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  const digest = createHash('sha256').update(await readFile(resolve(output, 'evidence.json'))).digest('hex');
  console.log(JSON.stringify({ complete: evidence.complete, tests: evidence.tests && { total: evidence.tests.total, passed: evidence.tests.passed, failed: evidence.tests.failed, skipped: evidence.tests.skipped }, cleanup: evidence.cleanup, evidence: resolve(output, 'evidence.json'), sha256: digest }));
}
