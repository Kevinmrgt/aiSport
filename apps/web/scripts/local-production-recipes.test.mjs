import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSessionSchedule } from '@alcide/shared';
import {
  assertLocalTestDatabase,
  fixtureContent,
} from '../../api/tests/helpers/local-ai-fixture.mjs';
import {
  recipeRouteCategory,
  summarizeRecipeFlight,
  recipeBrowserErrorCategory,
} from './local-production-recipes.mjs';

test('browser diagnostics retain only route categories and booleans, never private content', () => {
  const privateMarker = 'synthetic-secret-email-token-never-export';
  assert.equal(recipeRouteCategory(`/workouts?sport=${privateMarker}`), 'workout_history');
  assert.equal(recipeRouteCategory(`/private/${privateMarker}`), 'other');
  const summary = summarizeRecipeFlight({
    method: 'POST',
    status: 200,
    contentType: 'text/x-component',
    body: `Séance de recette locale ${privateMarker}`,
    headers: { cookie: privateMarker },
  });
  assert.deepEqual(summary, {
    method: 'POST',
    status: 200,
    flight: true,
    fixtureWorkoutPresent: true,
    emptyWorkoutHistoryPresent: false,
  });
  assert.equal(JSON.stringify(summary).includes(privateMarker), false);
  assert.equal(recipeBrowserErrorCategory(`nonce rejected ${privateMarker}`), 'csp');
  assert.equal(recipeBrowserErrorCategory(privateMarker), 'other');
});

test('local recipe refuses remote and ambiguously named databases', () => {
  assert.throws(() =>
    assertLocalTestDatabase('postgresql://user:synthetic@database.example.test/audit'),
  );
  assert.throws(() => assertLocalTestDatabase('postgresql://user:synthetic@127.0.0.1/production'));
  assert.throws(() => assertLocalTestDatabase('https://127.0.0.1/audit'));
  assert.equal(
    assertLocalTestDatabase('postgresql://user:synthetic@127.0.0.1/alcide_audit').hostname,
    '127.0.0.1',
  );
});

function total(session) {
  return buildSessionSchedule(session.exercises, session.warmup, session.cooldown)
    .reduce((sum, step) => sum + step.plannedSeconds, 0);
}

test('workout fixture preserves the requested sport, level and exact duration', () => {
  const workout = fixtureContent(
    `Request\n${JSON.stringify({ sport: 'marche', level: 'beginner', duration_minutes: 15 })}`,
  );
  assert.equal(workout.sport, 'marche');
  assert.equal(workout.difficulty, 'beginner');
  assert.equal(total(workout), 900);
});

test('program fixture creates only the requested week and session count', () => {
  const week = fixtureContent(
    `Request\n${JSON.stringify({ request: { sport: 'marche', weeks_count: 2, sessions_per_week: 2, session_duration_minutes: 20 }, weekNumber: 2 })}`,
  );
  assert.equal(week.week_number, 2);
  assert.equal(week.sessions.length, 2);
  assert.deepEqual(
    week.sessions.map((session) => session.session_number),
    [1, 2],
  );
  assert.ok(week.sessions.every((session) => total(session) === 1_200));
});
