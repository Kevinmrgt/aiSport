import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { accounts, users, workouts } from '../src/db/schema.js';
import type { TrainingProgram, Workout } from '@alcide/shared';

const testDatabaseUrl = process.env['TEST_DATABASE_URL'];
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;
const ownerId = randomUUID();
const otherUserId = randomUUID();
const ownerEmail = `integration-${ownerId}@alcide.test`;
const otherEmail = `integration-${otherUserId}@alcide.test`;
const identityUsers: string[] = [];

function workoutFixture(overrides: Partial<Workout> = {}): Workout {
  return {
    title: 'Seance integration',
    sport: 'course',
    difficulty: 'beginner',
    duration_minutes: 30,
    exercises: [
      {
        name: 'Course',
        description: 'Courir',
        duration_seconds: 1_800,
        rest_seconds: 0,
      },
    ],
    ...overrides,
  };
}

function programFixture(overrides: Partial<TrainingProgram> = {}): TrainingProgram {
  const session = (sessionNumber: number) => ({
    session_number: sessionNumber,
    title: `Seance ${sessionNumber}`,
    focus: 'Technique',
    duration_minutes: 20,
    exercises: [
      {
        name: 'Exercice',
        description: 'Mouvement controle',
        duration_seconds: 1_200,
        rest_seconds: 0,
      },
    ],
  });

  return {
    title: 'Programme integration',
    sport: 'fitness',
    difficulty: 'beginner',
    weeks_count: 2,
    sessions_per_week: 2,
    session_duration_minutes: 20,
    progression_summary: 'Progression testee',
    weeks: [1, 2].map((weekNumber) => ({
      week_number: weekNumber,
      theme: `Semaine ${weekNumber}`,
      objective: 'Progresser',
      sessions: [session(1), session(2)],
    })),
    ...overrides,
  };
}

describeWithDatabase('repositories PostgreSQL', () => {
  beforeAll(async () => {
    process.env['DATABASE_URL'] = testDatabaseUrl;
    const { db } = await import('../src/db/index.js');
    await db.insert(users).values([
      { id: ownerId, email: ownerEmail, name: 'Integration owner' },
      { id: otherUserId, email: otherEmail, name: 'Integration other' },
    ]);
  });

  afterAll(async () => {
    const { db, pool } = await import('../src/db/index.js');
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, otherUserId));
    if (identityUsers.length) await db.delete(users).where(inArray(users.id, identityUsers));
    await pool.end();
  });

  it('isole les sujets Google partageant un email et préserve le compte après changement d adresse', async () => {
    const { resolveGoogleIdentity } = await import('../src/repositories/identity.repository.js');
    const { createWorkout, findWorkoutById } =
      await import('../src/repositories/workout.repository.js');
    const email = `shared-${randomUUID()}@alcide.test`;
    const subject = `subject-${randomUUID()}`;
    const first = await resolveGoogleIdentity({ subject, email, name: 'First' });
    identityUsers.push(first);
    const other = await resolveGoogleIdentity({
      subject: `other-${randomUUID()}`,
      email,
      name: 'Other',
    });
    identityUsers.push(other);
    expect(other).not.toBe(first);
    const workout = await createWorkout(first, workoutFixture());
    await expect(findWorkoutById(workout.id, other)).rejects.toMatchObject({ statusCode: 403 });
    expect(
      await resolveGoogleIdentity({
        subject,
        email: `renamed-${randomUUID()}@alcide.test`,
        name: 'Renamed',
      }),
    ).toBe(first);
    await expect(findWorkoutById(workout.id, first)).resolves.toMatchObject({ id: workout.id });
  });

  it('sérialise les premières connexions concurrentes du même sujet', async () => {
    const { resolveGoogleIdentity } = await import('../src/repositories/identity.repository.js');
    const identity = {
      subject: `concurrent-${randomUUID()}`,
      email: `concurrent-${randomUUID()}@alcide.test`,
      name: null,
    };
    const ids = await Promise.all(Array.from({ length: 6 }, () => resolveGoogleIdentity(identity)));
    identityUsers.push(...new Set(ids));
    expect(new Set(ids).size).toBe(1);
  });

  it('refuse le rapprochement implicite legacy, dry-run ne modifie rien et mapping explicite conserve les données', async () => {
    const { db } = await import('../src/db/index.js');
    const { resolveGoogleIdentity, linkLegacyGoogleIdentity } =
      await import('../src/repositories/identity.repository.js');
    const legacyId = randomUUID();
    const email = `legacy-${randomUUID()}@alcide.test`;
    const subject = `legacy-sub-${randomUUID()}`;
    await db.insert(users).values({ id: legacyId, email });
    identityUsers.push(legacyId);
    await expect(
      resolveGoogleIdentity({ subject, email: email.toUpperCase(), name: null }),
    ).rejects.toMatchObject({ code: 'IDENTITY_LINK_REQUIRED', statusCode: 409 });
    const mapping = { userId: legacyId, subject, expectedEmail: email };
    await linkLegacyGoogleIdentity(mapping, false);
    expect(await db.select().from(accounts).where(eq(accounts.userId, legacyId))).toHaveLength(0);
    await expect(
      linkLegacyGoogleIdentity({ ...mapping, expectedEmail: 'wrong@alcide.test' }, true),
    ).rejects.toThrow('Mapping refusé');
    await linkLegacyGoogleIdentity(mapping, true);
    expect(await resolveGoogleIdentity({ subject, email, name: null })).toBe(legacyId);
    await expect(linkLegacyGoogleIdentity(mapping, true)).rejects.toThrow('identité déjà liée');
  });

  it('bloque les nouvelles valeurs scalaires invalides et rend les JSON anciens invalides supprimables', async () => {
    const { db } = await import('../src/db/index.js');
    const { findWorkoutById, deleteWorkout } =
      await import('../src/repositories/workout.repository.js');
    await expect(
      db.insert(workouts).values({
        userId: ownerId,
        title: 'Invalid',
        sport: 'test',
        difficulty: 'beginner',
        durationMinutes: -1,
        data: workoutFixture(),
      }),
    ).rejects.toThrow();
    const [row] = await db
      .insert(workouts)
      .values({
        userId: ownerId,
        title: 'Ancien JSON',
        sport: 'test',
        difficulty: 'beginner',
        durationMinutes: 30,
        data: { exercises: [] } as unknown as Workout,
      })
      .returning({ id: workouts.id });
    expect(row).toBeDefined();
    await expect(findWorkoutById(row!.id, ownerId)).rejects.toMatchObject({
      statusCode: 422,
      code: 'STORED_DATA_INVALID',
    });
    await deleteWorkout(row!.id, ownerId);
    expect(await db.select().from(workouts).where(eq(workouts.id, row!.id))).toHaveLength(0);
  });

  it('persiste, relit et protege une seance par son proprietaire', async () => {
    const { createWorkout, findWorkoutById } =
      await import('../src/repositories/workout.repository.js');
    const created = await createWorkout(ownerId, workoutFixture());
    await expect(findWorkoutById(created.id, ownerId)).resolves.toMatchObject({
      id: created.id,
      userId: ownerId,
    });
    await expect(findWorkoutById(created.id, otherUserId)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('journalise uniquement une source appartenant a l utilisateur', async () => {
    const { createWorkout } = await import('../src/repositories/workout.repository.js');
    const { createOwnedSessionLog } = await import('../src/services/session-log.service.js');
    const { findRecentSessionLogsByUser } =
      await import('../src/repositories/session-log.repository.js');
    const workout = await createWorkout(ownerId, {
      title: 'Seance a journaliser',
      sport: 'velo',
      difficulty: 'intermediate',
      duration_minutes: 20,
      exercises: [
        {
          name: 'Velo',
          description: 'Pedaler',
          duration_seconds: 1_200,
          rest_seconds: 0,
        },
      ],
    });
    const input = {
      sourceType: 'workout' as const,
      workoutId: workout.id,
      title: 'Valeur client ignoree',
      sport: 'Valeur client ignoree',
      difficulty: 'advanced' as const,
      plannedDurationMinutes: 240,
      completedAt: new Date(),
      durationSeconds: 1_200,
      perceivedEffort: 6,
      feedback: 'good' as const,
    };

    const created = await createOwnedSessionLog(ownerId, input);
    expect(created).toMatchObject({
      userId: ownerId,
      title: workout.title,
      sport: workout.sport,
      plannedDurationMinutes: workout.durationMinutes,
    });
    await expect(createOwnedSessionLog(otherUserId, input)).rejects.toMatchObject({
      statusCode: 403,
    });
    await expect(findRecentSessionLogsByUser(ownerId, 10)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.id })]),
    );
  });

  it('persiste un programme coherent et controle son proprietaire', async () => {
    const { createProgram, findProgramById } =
      await import('../src/repositories/program.repository.js');
    const created = await createProgram(ownerId, programFixture());
    await expect(findProgramById(created.id, ownerId)).resolves.toMatchObject({
      id: created.id,
      userId: ownerId,
    });
    await expect(findProgramById(created.id, otherUserId)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('liste, filtre, agrège et supprime les seances du seul proprietaire', async () => {
    const {
      createWorkout,
      deleteWorkout,
      findWorkoutById,
      findWorkoutsByUser,
      getWorkoutStatsByUser,
    } = await import('../src/repositories/workout.repository.js');
    const first = await createWorkout(
      ownerId,
      workoutFixture({
        title: 'Rameur debutant',
        sport: 'rameur-integration',
      }),
    );
    const second = await createWorkout(
      ownerId,
      workoutFixture({
        title: 'Rameur avance',
        sport: 'rameur-integration',
        difficulty: 'advanced',
      }),
    );
    await createWorkout(
      otherUserId,
      workoutFixture({
        title: 'Rameur autre compte',
        sport: 'rameur-integration',
      }),
    );

    await expect(
      findWorkoutsByUser(ownerId, {
        page: 1,
        limit: 1,
        sport: 'rameur-integration',
      }),
    ).resolves.toMatchObject({ total: 2, page: 1, limit: 1, hasMore: true });
    const filtered = await findWorkoutsByUser(ownerId, {
      sport: 'rameur-integration',
      level: 'advanced',
    });
    expect(filtered.workouts).toHaveLength(1);
    expect(filtered.workouts[0]?.id).toBe(second.id);

    const stats = await getWorkoutStatsByUser(ownerId);
    expect(stats.total).toBeGreaterThanOrEqual(4);
    expect(stats.bySport['rameur-integration']).toBe(2);
    expect(stats.byLevel.advanced).toBeGreaterThanOrEqual(1);
    expect(stats.lastGenerated).not.toBeNull();

    await deleteWorkout(first.id, ownerId);
    await expect(findWorkoutById(first.id, ownerId)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('pagine et supprime les programmes sans exposer ceux d un autre compte', async () => {
    const { createProgram, deleteProgram, findProgramById, findProgramsByUser } =
      await import('../src/repositories/program.repository.js');
    const first = await createProgram(ownerId, programFixture({ title: 'Programme A' }));
    await createProgram(ownerId, programFixture({ title: 'Programme B' }));
    await createProgram(otherUserId, programFixture({ title: 'Programme prive' }));

    const page = await findProgramsByUser(ownerId, { page: 1, limit: 2 });
    expect(page.total).toBeGreaterThanOrEqual(3);
    expect(page.programs).toHaveLength(2);
    expect(page.hasMore).toBe(true);
    expect(page.programs.every((program) => program.title !== 'Programme prive')).toBe(true);

    await deleteProgram(first.id, ownerId);
    await expect(findProgramById(first.id, ownerId)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('calcule les statistiques de journaux et isole les comptes', async () => {
    const { createWorkout } = await import('../src/repositories/workout.repository.js');
    const { createSessionLog, findRecentSessionLogsByUser, getSessionLogStatsByUser } =
      await import('../src/repositories/session-log.repository.js');
    const workout = await createWorkout(ownerId, workoutFixture({ title: 'Stats journal' }));
    await createSessionLog(ownerId, {
      sourceType: 'workout',
      workoutId: workout.id,
      title: workout.title,
      sport: workout.sport,
      difficulty: workout.difficulty,
      plannedDurationMinutes: workout.durationMinutes,
      completedAt: new Date('2026-07-20T08:00:00.000Z'),
      durationSeconds: 900,
      perceivedEffort: 4,
      feedback: 'too_easy',
      painNotes: 'Aucune',
      notes: 'Test PostgreSQL',
    });

    const ownerStats = await getSessionLogStatsByUser(ownerId);
    expect(ownerStats.totalCompleted).toBe(2);
    expect(ownerStats.totalDurationSeconds).toBe(2_100);
    expect(ownerStats.averageEffort).toBe(5);
    expect(ownerStats.feedbackCounts).toMatchObject({ too_easy: 1, good: 1, too_hard: 0 });
    expect(ownerStats.lastCompletedAt).not.toBeNull();
    await expect(findRecentSessionLogsByUser(otherUserId, 10)).resolves.toEqual([]);
    await expect(getSessionLogStatsByUser(otherUserId)).resolves.toMatchObject({
      totalCompleted: 0,
      totalDurationSeconds: 0,
      averageEffort: null,
      feedbackCounts: { too_easy: 0, good: 0, too_hard: 0 },
      lastCompletedAt: null,
    });
  });

  it('journalise une vraie seance de programme et rejette une seance absente', async () => {
    const { createProgram } = await import('../src/repositories/program.repository.js');
    const { createOwnedSessionLog } = await import('../src/services/session-log.service.js');
    const program = await createProgram(ownerId, programFixture());
    const input = {
      sourceType: 'program_session' as const,
      programId: program.id,
      programWeekNumber: 1,
      programSessionNumber: 2,
      title: 'Valeur client ignoree',
      sport: 'Valeur client ignoree',
      difficulty: 'advanced' as const,
      plannedDurationMinutes: 240,
      completedAt: new Date(),
      durationSeconds: 1_200,
      perceivedEffort: 7,
      feedback: 'too_hard' as const,
    };

    await expect(createOwnedSessionLog(ownerId, input)).resolves.toMatchObject({
      userId: ownerId,
      programId: program.id,
      title: 'Seance 2',
      sport: program.sport,
      difficulty: program.difficulty,
      plannedDurationMinutes: 20,
    });
    await expect(
      createOwnedSessionLog(ownerId, {
        ...input,
        programSessionNumber: 99,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      createOwnedSessionLog(ownerId, {
        ...input,
        programId: undefined,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('cree puis met a jour les reglages IA persistants', async () => {
    const { findSettingsByUser, upsertSettings } =
      await import('../src/repositories/settings.repository.js');
    await expect(findSettingsByUser(ownerId)).resolves.toBeNull();
    await upsertSettings(ownerId, { aiModel: 'gpt-integration-1' });
    await expect(findSettingsByUser(ownerId)).resolves.toEqual({
      provider: 'openai',
      aiApiKeyEncrypted: null,
      aiModel: 'gpt-integration-1',
    });
    await upsertSettings(ownerId, {});
    await expect(findSettingsByUser(ownerId)).resolves.toMatchObject({
      aiModel: 'gpt-integration-1',
    });
    await upsertSettings(ownerId, { aiModel: null });
    await expect(findSettingsByUser(ownerId)).resolves.toMatchObject({ aiModel: null });
  });

  it('départage les dates égales par UUID sans doublon entre pages', async () => {
    const { db } = await import('../src/db/index.js');
    const { findWorkoutsByUser } = await import('../src/repositories/workout.repository.js');
    const account = randomUUID();
    identityUsers.push(account);
    await db.insert(users).values({ id: account, email: `pages-${account}@alcide.test` });
    const ids = Array.from({ length: 5 }, () => randomUUID());
    const fixture = workoutFixture();
    await db.insert(workouts).values(
      ids.map((id) => ({
        id,
        userId: account,
        title: fixture.title,
        sport: fixture.sport,
        difficulty: fixture.difficulty,
        durationMinutes: fixture.duration_minutes,
        data: fixture,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      })),
    );
    const first = await findWorkoutsByUser(account, { page: 1, limit: 2 });
    const second = await findWorkoutsByUser(account, { page: 2, limit: 2 });
    const third = await findWorkoutsByUser(account, { page: 3, limit: 2 });
    expect([...first.workouts, ...second.workouts, ...third.workouts].map((row) => row.id)).toEqual(
      [...ids].sort().reverse(),
    );
    expect(first.total).toBe(5);
    expect(third.hasMore).toBe(false);
  });

  it('conserve les totaux statistiques cohérents pendant des créations concurrentes', async () => {
    const { db } = await import('../src/db/index.js');
    const { createWorkout, getWorkoutStatsByUser } =
      await import('../src/repositories/workout.repository.js');
    const account = randomUUID();
    identityUsers.push(account);
    await db.insert(users).values({ id: account, email: `stats-${account}@alcide.test` });
    await Promise.all([
      (async () => {
        for (let index = 0; index < 8; index++) await createWorkout(account, workoutFixture());
      })(),
      (async () => {
        for (let index = 0; index < 8; index++) {
          const stats = await getWorkoutStatsByUser(account);
          expect(Object.values(stats.byLevel).reduce((sum, count) => sum + count, 0)).toBe(
            stats.total,
          );
          expect(Object.values(stats.bySport).reduce((sum, count) => sum + count, 0)).toBe(
            stats.total,
          );
        }
      })(),
    ]);
  });
});
