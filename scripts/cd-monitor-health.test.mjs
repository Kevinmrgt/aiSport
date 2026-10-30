import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { probeGap } from './cd-monitor-health.mjs';

test('delayed or invalid monitor executions cannot be reported fresh', () => {
  const now = Date.parse('2026-10-29T12:00:00Z');
  assert.deepEqual(probeGap(null, { now }), { status: 'no_previous_scheduled_run', minutes: null });
  assert.equal(probeGap('2026-10-29T11:00:00Z', { now }).minutes, 60);
  assert.throws(() => probeGap('2026-10-29T08:00:00Z', { now }), /gap/);
  assert.throws(() => probeGap('not-a-date', { now }), /Invalid/);
});

test('an explicitly observed maintenance resumption replaces only an older scheduled baseline and preserves provenance', () => {
  const resumedAt = '2026-10-30T11:43:21.649Z';
  const now = Date.parse('2026-10-30T12:13:21.649Z');
  const previous = '2026-10-30T07:07:00Z';
  assert.throws(() => probeGap(previous, { now }), /exceeds 120/);
  assert.deepEqual(probeGap(previous, { now, resumedAt }), {
    status: 'within_target', minutes: 30,
    baselineAt: resumedAt, baselineSource: 'maintenance_resumption',
    previousScheduledRunAt: '2026-10-30T07:07:00.000Z', maintenanceResumedAt: resumedAt,
  });
  assert.equal(probeGap(null, { now, resumedAt }).baselineSource, 'maintenance_resumption');
});

test('an older resumption cannot roll back a newer real scheduled execution', () => {
  const result = probeGap('2026-10-30T12:00:00Z', {
    now: Date.parse('2026-10-30T12:30:00Z'), resumedAt: '2026-10-30T11:43:21.649Z',
  });
  assert.equal(result.minutes, 30); assert.equal(result.baselineSource, 'previous_scheduled_run');
  assert.equal(result.baselineAt, '2026-10-30T12:00:00.000Z');
  assert.equal(result.maintenanceResumedAt, '2026-10-30T11:43:21.649Z');
});

test('invalid, non-UTC or future resumption dates fail closed even with a fresh scheduled probe', () => {
  const now = Date.parse('2026-10-30T12:00:00Z');
  for (const resumedAt of ['not-a-date', ' ', '2026-02-30T11:00:00Z', '2026-10-30', '2026-10-30T11:00:00+00:00', '2026-10-30T12:00:00.001Z']) {
    assert.throws(() => probeGap('2026-10-30T11:59:00Z', { now, resumedAt }), /Invalid maintenance monitoring resumption time/);
  }
  assert.throws(() => probeGap('not-a-date', { now, resumedAt: '2026-10-30T11:59:00Z' }), /Invalid previous/);
  assert.throws(() => probeGap(null, { now, resumedAt: '2026-10-30T13:00:00Z' }), /Invalid maintenance/);
});

test('an empty or absent resumption preserves every legacy result and gap failure', () => {
  const now = Date.parse('2026-10-30T12:00:00Z');
  for (const resumedAt of [undefined, null, '']) {
    assert.deepEqual(probeGap(null, { now, resumedAt }), { status: 'no_previous_scheduled_run', minutes: null });
    assert.deepEqual(probeGap('2026-10-30T11:00:00Z', { now, resumedAt }), { status: 'within_target', minutes: 60 });
    assert.throws(() => probeGap('2026-10-30T07:07:00Z', { now, resumedAt }), /exceeds 120/);
  }
});

test('the maintenance baseline never refreshes itself and the next excessive gap still alerts with its provenance', () => {
  const resumedAt = '2026-10-30T11:43:21.649Z';
  assert.throws(() => probeGap('2026-10-30T07:07:00Z', { now: Date.parse('2026-10-30T13:44:21.649Z'), resumedAt }), (error) => {
    assert.match(error.message, /exceeds 120/);
    assert.equal(error.scheduler.status, 'gap_exceeded'); assert.equal(error.scheduler.minutes, 121);
    assert.equal(error.scheduler.baselineAt, resumedAt); assert.equal(error.scheduler.baselineSource, 'maintenance_resumption');
    assert.equal(error.scheduler.previousScheduledRunAt, '2026-10-30T07:07:00.000Z'); return true;
  });
});

test('the workflow reads the optional operator variable and never counts simulations as production probes', async () => {
  const workflow = await readFile(new URL('../.github/workflows/production-health-monitor.yml', import.meta.url), 'utf8');
  assert.ok(workflow.includes('PROD_MONITOR_RESUMED_AT: ${{ vars.PROD_MONITOR_RESUMED_AT }}'));
  assert.match(workflow, /Read previous scheduled probe time\s*\n\s*if: env\.CHECK_MODE == 'production'/);
  assert.ok(workflow.includes('runs?event=schedule&per_page=20'));
  const actualProbe = workflow.indexOf('node scripts/cd-monitor-health.mjs');
  const alertSimulation = workflow.indexOf('if [ "$CHECK_MODE" = "simulate_alert" ]');
  const recoverySimulation = workflow.indexOf('if [ "$CHECK_MODE" = "simulate_recovery" ]');
  assert.ok(alertSimulation < recoverySimulation && recoverySimulation < actualProbe);
  assert.match(workflow.slice(alertSimulation, recoverySimulation), /Production endpoints: not probed[\s\S]*exit 1/);
  assert.match(workflow.slice(recoverySimulation, actualProbe), /Production endpoints: not probed[\s\S]*exit 0/);
  assert.equal(workflow.includes('PROD_MONITOR_RESUMED_AT=$(date'), false);
});
