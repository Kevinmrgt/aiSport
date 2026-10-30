import assert from 'node:assert/strict';
import test from 'node:test';
import { probeGap } from './cd-monitor-health.mjs';

test('delayed or invalid monitor executions cannot be reported fresh', () => {
  const now = Date.parse('2026-10-29T12:00:00Z');
  assert.deepEqual(probeGap(null, { now }), { status: 'no_previous_scheduled_run', minutes: null });
  assert.equal(probeGap('2026-10-29T11:00:00Z', { now }).minutes, 60);
  assert.throws(() => probeGap('2026-10-29T08:00:00Z', { now }), /gap/);
  assert.throws(() => probeGap('not-a-date', { now }), /Invalid/);
});
