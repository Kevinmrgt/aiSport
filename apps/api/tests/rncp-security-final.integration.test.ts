import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Workout } from '@alcide/shared';
import { users, workouts } from '../src/db/schema.js';

const testDatabaseUrl = process.env['TEST_DATABASE_URL'];
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;
const userId = randomUUID();
const userEmail = `rncp-security-${userId}@alcide.test`;
const sqlLikeValue = "'; DROP TABLE workouts; --";

let closePool: () => Promise<void>;

describeWithDatabase('RNCP final PostgreSQL security recipe', () => {
  beforeAll(async () => {
    if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is required');
    process.env['DATABASE_URL'] = testDatabaseUrl;
    const { db, pool } = await import('../src/db/index.js');
    closePool = () => pool.end();
    await db.insert(users).values({ id: userId, email: userEmail, name: 'RNCP security test' });
  });

  afterAll(async () => {
    const { db } = await import('../src/db/index.js');
    // OWASP: A03 — deterministic cleanup proves the test leaves no application row behind.
    await db.delete(users).where(eq(users.id, userId));
    await closePool();
  });

  it('CR-042 persists SQL-like text as data and leaves the workouts table queryable', async () => {
    const fixture: Workout = {
      title: 'RNCP parameterization proof',
      sport: sqlLikeValue,
      difficulty: 'beginner',
      duration_minutes: 15,
      exercises: [
        {
          name: 'Controlled exercise',
          description: 'No SQL is executed from this value',
          duration_seconds: 900,
          rest_seconds: 0,
        },
      ],
    };
    const { createWorkout, findWorkoutById } =
      await import('../src/repositories/workout.repository.js');
    const { db } = await import('../src/db/index.js');

    // OWASP: A03 — the repository sends the controlled payload through Drizzle parameters.
    const created = await createWorkout(userId, fixture);
    const reloaded = await findWorkoutById(created.id, userId);
    expect(reloaded.sport).toBe(sqlLikeValue);
    expect(reloaded.data.sport).toBe(sqlLikeValue);

    // A successful SELECT after insertion proves that the relation still exists and is usable.
    const rows = await db
      .select({ id: workouts.id, sport: workouts.sport })
      .from(workouts)
      .where(eq(workouts.id, created.id));
    expect(rows).toEqual([{ id: created.id, sport: sqlLikeValue }]);
  });
});
