import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { users, sessionLogs } from '../src/db/schema.js';
import type { CreateSessionLogInput } from '../src/repositories/session-log.repository.js';

const testUrl = process.env['TEST_DATABASE_URL'];
const owner = randomUUID();
const other = randomUUID();
let workoutId: string;
let close: () => Promise<void>;

describe.skipIf(!testUrl)('session log operation replay on PostgreSQL', () => {
  beforeAll(async () => {
    process.env['DATABASE_URL'] = testUrl!;
    const { db, pool } = await import('../src/db/index.js');
    close = () => pool.end();
    await db.insert(users).values([
      { id: owner, email: `${owner}@audit.invalid` },
      { id: other, email: `${other}@audit.invalid` },
    ]);
    const { createWorkout } = await import('../src/repositories/workout.repository.js');
    const row = await createWorkout(owner, {
      title: 'Operation fixture',
      sport: 'course',
      difficulty: 'beginner',
      duration_minutes: 15,
      exercises: [
        { name: 'Marche', description: 'Allure facile', duration_seconds: 900, rest_seconds: 0 },
      ],
    });
    workoutId = row.id;
  });

  afterAll(async () => {
    const { db } = await import('../src/db/index.js');
    await db.delete(users).where(inArray(users.id, [owner, other]));
    await close();
  });

  it('persists once for concurrent retries, rejects changed data and isolates owners', async () => {
    const { createOwnedSessionLog } = await import('../src/services/session-log.service.js');
    const { db } = await import('../src/db/index.js');
    const input: CreateSessionLogInput = {
      operationId: randomUUID(),
      sourceType: 'workout',
      workoutId,
      title: 'ignored client title',
      sport: 'ignored',
      difficulty: 'advanced',
      plannedDurationMinutes: 99,
      durationSeconds: 900,
      perceivedEffort: 4,
      feedback: 'good',
      completedAt: new Date(),
      notes: 'Facile',
    };
    const [first, replay] = await Promise.all([
      createOwnedSessionLog(owner, input),
      createOwnedSessionLog(owner, input),
    ]);
    expect(replay.id).toBe(first.id);
    expect(first.title).toBe('Operation fixture');
    expect(await db.select().from(sessionLogs).where(eq(sessionLogs.userId, owner))).toHaveLength(
      1,
    );
    await expect(
      createOwnedSessionLog(owner, { ...input, notes: 'Different' }),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(createOwnedSessionLog(other, input)).rejects.toMatchObject({ statusCode: 403 });
    const next = await createOwnedSessionLog(owner, { ...input, operationId: randomUUID() });
    expect(next.id).not.toBe(first.id);
    expect(await db.select().from(sessionLogs).where(eq(sessionLogs.userId, owner))).toHaveLength(
      2,
    );
  });
});
