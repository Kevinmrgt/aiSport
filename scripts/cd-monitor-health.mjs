import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkHealth } from './cd-health-check.mjs';

export function probeGap(previousRunAt, { now = Date.now(), maxGapMinutes = 120 } = {}) {
  if (!Number.isInteger(maxGapMinutes) || maxGapMinutes < 1 || maxGapMinutes > 1_440) {
    throw new Error('Invalid monitoring gap target');
  }
  if (!previousRunAt) return { status: 'no_previous_scheduled_run', minutes: null };
  const previous = Date.parse(previousRunAt);
  if (!Number.isFinite(previous) || previous > now + 60_000) throw new Error('Invalid previous monitor execution time');
  const minutes = Math.round((now - previous) / 60_000);
  if (minutes > maxGapMinutes) throw new Error(`Monitoring execution gap exceeds ${maxGapMinutes} minutes`);
  return { status: 'within_target', minutes };
}

async function main() {
  const directory = process.env['MONITOR_REPORT_DIRECTORY'] ?? 'monitoring-report';
  await mkdir(directory, { recursive: true });
  const report = { checkedAt: new Date().toISOString(), result: 'passed', checks: [], failures: [] };
  try {
    report.scheduler = probeGap(process.env['MONITOR_PREVIOUS_RUN_AT'], {
      maxGapMinutes: Number(process.env['MONITOR_MAX_GAP_MINUTES'] ?? 120),
    });
  } catch (error) { report.failures.push(error.message); }
  let revision = process.env['PROD_EXPECTED_REVISION'] || undefined;
  for (const endpoint of [
    { url: process.env['WEB_HEALTH_URL'] ?? 'https://www.alcideai.fr/api/health', service: 'alcide-web', status: 'ok' },
    { url: process.env['API_HEALTH_URL'] ?? 'https://ai-sport-api.vercel.app/health/ready', service: 'alcide-api', status: 'ready' },
  ]) {
    try {
      const result = await checkHealth(endpoint.url, { service: endpoint.service, status: endpoint.status, revision });
      revision ??= result.revision;
      report.checks.push(result);
    } catch (error) { report.failures.push(`${endpoint.service}: ${error.message}`); }
  }
  if (report.failures.length) { report.result = 'failed'; process.exitCode = 1; }
  await writeFile(join(directory, 'production-health.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(join(directory, 'production-health.md'), [
    '# Production health monitor', '', `- Checked at: ${report.checkedAt}`,
    `- Result: ${report.result}`, `- Revision: ${revision ?? 'unverified'}`,
    ...report.failures.map((failure) => `- Failure: ${failure}`), '',
    'Health validates availability, schema presence and release identity; it does not call the paid AI provider or exercise OAuth.',
  ].join('\n'));
  console.log(JSON.stringify(report));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error('Monitoring could not complete; no health success recorded'); process.exitCode = 1; });
}
