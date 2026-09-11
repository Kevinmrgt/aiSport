import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { betaCreditAdjustments, betaTesters, users } from '../src/db/schema.js';
import type { TrainingProgram, Workout } from '@alcide/shared';

const testDatabaseUrl = process.env['TEST_DATABASE_URL'];
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;
const ownerId = randomUUID();
const otherUserId = randomUUID();
const quotaOwnerId = randomUUID();
const ownerEmail = `integration-${ownerId}@alcide.test`;
const otherEmail = `integration-${otherUserId}@alcide.test`;
const quotaOwnerEmail = `integration-quota-${quotaOwnerId}@alcide.test`;
const betaEmail = `integration-beta-${randomUUID()}@alcide.test`;

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
      { id: quotaOwnerId, email: quotaOwnerEmail, name: 'Integration quota owner' },
    ]);
  });

  afterAll(async () => {
    const { db, pool } = await import('../src/db/index.js');
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, otherUserId));
    await db.delete(users).where(eq(users.id, quotaOwnerId));
    await db.delete(users).where(eq(users.email, betaEmail));
    await pool.end();
  });

  it('reserve au plus 30 generations meme avec 31 requetes concurrentes', async () => {
    const { getGenerationQuotaUsage, releaseGenerationSlot, reserveGenerationSlot } =
      await import('../src/repositories/generation-quota.repository.js');

    const reservations = await Promise.all(
      Array.from({ length: 31 }, () => reserveGenerationSlot(quotaOwnerId, 30)),
    );

    expect(reservations.filter((reservation) => reservation !== null)).toHaveLength(30);
    expect(reservations.filter((reservation) => reservation === null)).toHaveLength(1);
    await expect(getGenerationQuotaUsage(quotaOwnerId, 30)).resolves.toBe(30);

    await releaseGenerationSlot(quotaOwnerId);
    await expect(getGenerationQuotaUsage(quotaOwnerId, 30)).resolves.toBe(29);
    await expect(reserveGenerationSlot(quotaOwnerId, 30)).resolves.toMatchObject({
      used: 30,
      remaining: 0,
    });
  });

  it('gère atomiquement le solde beta, son audit et les sessions révoquées', async () => {
    const {
      adjustBetaBalance,
      changeBetaPassword,
      createBetaTester,
      deleteBetaTester,
      findActiveBetaSession,
      findBetaByUserId,
      findBetaForAuthentication,
      listBetaTesters,
      releaseBetaGeneration,
      reserveBetaGeneration,
      resetBetaPassword,
      setBetaStatus,
    } = await import('../src/repositories/beta-tester.repository.js');
    const { db } = await import('../src/db/index.js');
    const initialSessionVersion = randomUUID();

    const created = await createBetaTester({
      name: 'Integration beta tester',
      email: betaEmail,
      passwordHash: 'initial-hash',
      generationBalance: 3,
      sessionVersion: initialSessionVersion,
      adminEmail: 'admin@alcide.test',
    });
    expect(created).toMatchObject({
      email: betaEmail,
      active: true,
      generationBalance: 3,
      mustChangePassword: true,
    });
    const betaUserId = created.userId;

    const existingUserBeta = await createBetaTester({
      name: 'Nom beta ignore car le compte existe déjà',
      email: ownerEmail,
      passwordHash: 'existing-user-hash',
      generationBalance: 2,
      sessionVersion: randomUUID(),
      adminEmail: 'admin@alcide.test',
    });
    expect(existingUserBeta).toMatchObject({
      userId: ownerId,
      email: ownerEmail,
      name: 'Integration owner',
      generationBalance: 2,
    });
    await expect(deleteBetaTester(ownerId)).resolves.toBe(true);
    await expect(deleteBetaTester(ownerId)).resolves.toBe(false);
    await expect(db.select().from(users).where(eq(users.id, ownerId))).resolves.toHaveLength(1);

    await expect(findBetaForAuthentication(betaEmail)).resolves.toMatchObject({
      userId: betaUserId,
      passwordHash: 'initial-hash',
      active: 1,
      mustChangePassword: 1,
      sessionVersion: initialSessionVersion,
    });
    await expect(findActiveBetaSession(betaUserId, initialSessionVersion)).resolves.toMatchObject({
      active: 1,
      generationBalance: 3,
    });
    await expect(listBetaTesters()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: betaUserId, active: true, mustChangePassword: true }),
      ]),
    );

    await expect(adjustBetaBalance(betaUserId, 5, 'admin@alcide.test')).resolves.toBe(8);
    await expect(adjustBetaBalance(betaUserId, -9, 'admin@alcide.test')).resolves.toBeNull();
    const adjustments = await db
      .select()
      .from(betaCreditAdjustments)
      .where(eq(betaCreditAdjustments.betaUserId, betaUserId));
    expect(adjustments.map((adjustment) => [adjustment.amount, adjustment.balanceAfter])).toEqual([
      [3, 3],
      [5, 8],
    ]);

    const reservations = await Promise.all(
      Array.from({ length: 9 }, () => reserveBetaGeneration(betaUserId)),
    );
    expect(reservations.filter(Boolean)).toHaveLength(8);
    expect(reservations.filter((reservation) => reservation === null)).toHaveLength(1);
    await releaseBetaGeneration(betaUserId);
    await expect(reserveBetaGeneration(betaUserId)).resolves.toMatchObject({ remaining: 0 });

    const revokedSessionVersion = randomUUID();
    await expect(setBetaStatus(betaUserId, false, revokedSessionVersion)).resolves.toBe(true);
    await expect(findActiveBetaSession(betaUserId, initialSessionVersion)).resolves.toBeUndefined();
    await expect(reserveBetaGeneration(betaUserId)).resolves.toBeNull();
    await expect(setBetaStatus(betaUserId, true, randomUUID())).resolves.toBe(true);
    await expect(setBetaStatus(randomUUID(), true, randomUUID())).resolves.toBe(false);

    await expect(resetBetaPassword(betaUserId, 'reset-hash', randomUUID())).resolves.toBe(true);
    await expect(resetBetaPassword(randomUUID(), 'reset-hash', randomUUID())).resolves.toBe(false);
    await expect(findBetaByUserId(betaUserId)).resolves.toEqual({
      passwordHash: 'reset-hash',
      active: 1,
    });
    await changeBetaPassword(betaUserId, 'changed-hash');
    await expect(findBetaByUserId(betaUserId)).resolves.toEqual({
      passwordHash: 'changed-hash',
      active: 1,
    });
    await expect(
      db.select().from(betaTesters).where(eq(betaTesters.userId, betaUserId)),
    ).resolves.toEqual([expect.objectContaining({ mustChangePassword: 0 })]);
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

  it('persiste les reglages par defaut de la plateforme', async () => {
    const { findPlatformSettings, upsertPlatformSettings } =
      await import('../src/repositories/settings.repository.js');

    await expect(findPlatformSettings()).resolves.toBeNull();

    await upsertPlatformSettings({
      defaultAiModel: 'gpt-5.4-mini',
      defaultBetaGenerationBalance: 12,
    });
    await expect(findPlatformSettings()).resolves.toEqual({
      defaultAiModel: 'gpt-5.4-mini',
      defaultBetaGenerationBalance: 12,
    });

    await upsertPlatformSettings({
      defaultAiModel: 'gpt-5.5',
      defaultBetaGenerationBalance: 24,
    });
    await expect(findPlatformSettings()).resolves.toEqual({
      defaultAiModel: 'gpt-5.5',
      defaultBetaGenerationBalance: 24,
    });
  });

  it('calcule les statistiques globales de la plateforme', async () => {
    const { getAdminPlatformAnalytics, getAdminPlatformStats } =
      await import('../src/repositories/admin-dashboard.repository.js');
    const { recordPageVisit } = await import('../src/repositories/visitor-analytics.repository.js');

    const stats = await getAdminPlatformStats();

    expect(stats.totalUsers).toBeGreaterThanOrEqual(4);
    expect(stats.betaTesterCount).toBe(1);
    expect(stats.activeBetaTesterCount).toBe(1);
    expect(stats.pendingPasswordChangeCount).toBe(0);
    expect(stats.availableGenerations).toBe(0);
    expect(stats.workoutCount).toBeGreaterThanOrEqual(5);
    expect(stats.programCount).toBeGreaterThanOrEqual(4);
    expect(stats.completedSessionCount).toBe(3);
    expect(stats.newUsersLast30Days).toBeGreaterThanOrEqual(4);

    await recordPageVisit();
    await recordPageVisit();

    const analytics = await getAdminPlatformAnalytics();
    expect(analytics.daily).toHaveLength(90);
    expect(analytics.daily.every((day) => /^\d{4}-\d{2}-\d{2}$/.test(day.date))).toBe(true);
    expect(analytics.daily.some((day) => day.workouts > 0)).toBe(true);
    expect(analytics.daily.some((day) => day.programs > 0)).toBe(true);
    expect(analytics.daily.some((day) => day.completedSessions > 0)).toBe(true);
    expect(analytics.daily.some((day) => day.visits >= 2)).toBe(true);
    expect(analytics.sportActivity).toEqual(
      expect.arrayContaining([expect.objectContaining({ sport: 'course' })]),
    );
  });
});
