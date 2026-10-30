import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';
import type { Workout } from '@alcide/shared';

const databaseUrl = process.env['TEST_DATABASE_URL'];
const subjects: string[] = [];
const emails: string[] = [];
const syntheticKey = `privacy-integration-${randomUUID()}`;

describe.skipIf(!databaseUrl)('privacy PostgreSQL rights and erasure', () => {
  beforeAll(() => {
    process.env['DATABASE_URL'] = databaseUrl;
    process.env['PRIVACY_REVOCATION_SECRET'] = syntheticKey;
  });
  afterAll(async () => {
    const { db, pool } = await import('../src/db/index.js');
    const { users } = await import('../src/db/schema.js');
    const { accountRevocations } = await import('../src/db/privacy.schema.js');
    const { identityHash } = await import('../src/services/account-session.service.js');
    if (emails.length) await db.delete(users).where(inArray(users.email, emails));
    if (subjects.length)
      await db
        .delete(accountRevocations)
        .where(inArray(accountRevocations.subjectHash, subjects.map(identityHash)));
    await pool.end();
    delete process.env['PRIVACY_REVOCATION_SECRET'];
  });

  async function newAccount() {
    const subject = `privacy-${randomUUID()}`;
    const email = `${subject}@alcide.test`;
    subjects.push(subject);
    emails.push(email);
    const { resolveGoogleIdentity } = await import('../src/repositories/identity.repository.js');
    return {
      id: await resolveGoogleIdentity({
        subject,
        email,
        name: 'Synthetic privacy test',
        issuedAt: Date.now(),
      }),
      subject,
      email,
    };
  }

  it('exports only owner rows and cascades all account data while rejecting old sessions', async () => {
    const owner = await newAccount();
    const other = await newAccount();
    const { db } = await import('../src/db/index.js');
    const schema = await import('../src/db/schema.js');
    const budget = await import('../src/db/generation-budget.schema.js');
    const { accountRevocations } = await import('../src/db/privacy.schema.js');
    const { createWorkout } = await import('../src/repositories/workout.repository.js');
    const { exportOwnedAccount, eraseOwnedAccount } =
      await import('../src/services/account.service.js');
    const { assertGoogleSessionActive, identityHash, parseSessionIssuedAt, SESSION_CLOCK_SKEW_MS } =
      await import('../src/services/account-session.service.js');
    const { resolveGoogleIdentity } = await import('../src/repositories/identity.repository.js');
    const fixture: Workout = {
      title: 'Private owner workout',
      sport: 'course',
      difficulty: 'beginner',
      duration_minutes: 15,
      exercises: [
        { name: 'Course', description: 'Contrôle', duration_seconds: 900, rest_seconds: 0 },
      ],
    };
    const workout = await createWorkout(owner.id, fixture);
    const aliasSubject = `alias-${owner.subject}`;
    subjects.push(aliasSubject);
    await db
      .insert(schema.accounts)
      .values({
        userId: owner.id,
        type: 'oidc',
        provider: 'google',
        providerAccountId: aliasSubject,
      });
    await createWorkout(other.id, { ...fixture, title: 'OTHER_OWNER_SENTINEL' });
    await db
      .insert(schema.userSettings)
      .values({
        userId: owner.id,
        aiModel: 'gpt-5.4-mini',
        aiApiKeyEncrypted: 'PRIVATE_CREDENTIAL_SENTINEL',
      });
    await db
      .insert(schema.sessionLogs)
      .values({
        userId: owner.id,
        sourceType: 'workout',
        workoutId: workout.id,
        title: 'Old retained note',
        sport: 'course',
        difficulty: 'beginner',
        plannedDurationMinutes: 15,
        completedAt: new Date(),
        durationSeconds: 900,
        perceivedEffort: 5,
        feedback: 'good',
        painNotes: 'LEGACY_PRIVATE_NOTE',
      });
    const [operation] = await db
      .insert(budget.generationOperations)
      .values({
        userId: owner.id,
        operationKey: randomUUID(),
        kind: 'workout',
        inputHash: 'a'.repeat(64),
        resourceId: workout.id,
        leaseExpiresAt: new Date(Date.now() + 10_000),
      })
      .returning({ id: budget.generationOperations.id });
    if (!operation) throw new Error('Missing operation fixture');
    await db
      .insert(budget.generationUsageEvents)
      .values({
        operationId: operation.id,
        eventKey: 'event-fixture',
        model: 'gpt-5.4-mini',
        inputTokens: 2,
        outputTokens: 3,
        totalTokens: 5,
      });
    await db
      .insert(budget.generationDailyBudgets)
      .values({
        scope: `user:${owner.id}`,
        day: new Date().toISOString().slice(0, 10),
        userId: owner.id,
      });
    const exported = await exportOwnedAccount(owner.id);
    expect(exported.workouts).toHaveLength(1);
    expect(exported.sessionLogs[0]?.painNotes).toBe('LEGACY_PRIVATE_NOTE');
    expect(exported.generationOperations).toHaveLength(1);
    expect(exported.generationUsage).toHaveLength(1);
    expect(JSON.stringify(exported)).not.toMatch(
      /OTHER_OWNER_SENTINEL|PRIVATE_CREDENTIAL_SENTINEL|event-fixture/,
    );

    const erasedAt = new Date();
    await expect(eraseOwnedAccount(owner.id, other.subject, erasedAt)).rejects.toMatchObject({
      statusCode: 403,
    });
    await eraseOwnedAccount(owner.id, owner.subject, erasedAt);
    for (const table of [
      schema.workouts,
      schema.trainingPrograms,
      schema.sessionLogs,
      schema.userSettings,
      schema.generationQuotas,
      budget.generationOperations,
      budget.generationDailyBudgets,
    ]) {
      expect(await db.select().from(table).where(eq(table.userId, owner.id))).toHaveLength(0);
    }
    expect(
      await db
        .select()
        .from(budget.generationUsageEvents)
        .where(eq(budget.generationUsageEvents.operationId, operation.id)),
    ).toHaveLength(0);
    await expect(
      assertGoogleSessionActive(owner.subject, erasedAt.getTime() - 1),
    ).rejects.toMatchObject({ statusCode: 401 });
    await expect(
      assertGoogleSessionActive(aliasSubject, erasedAt.getTime() - 1),
    ).rejects.toMatchObject({ statusCode: 401 });
    await expect(
      resolveGoogleIdentity({
        subject: owner.subject,
        email: owner.email,
        name: null,
        issuedAt: erasedAt.getTime() - 1,
      }),
    ).rejects.toMatchObject({ statusCode: 401 });
    for (const offset of [0, 1, 1000, 30_000]) {
      const issuedAt = parseSessionIssuedAt(
        String(erasedAt.getTime() + offset),
        erasedAt.getTime(),
      );
      await expect(
        resolveGoogleIdentity({ subject: owner.subject, email: owner.email, name: null, issuedAt }),
      ).rejects.toMatchObject({ statusCode: 401 });
    }
    expect(await db.select().from(schema.users).where(eq(schema.users.id, owner.id))).toHaveLength(
      0,
    );
    const freshId = await resolveGoogleIdentity({
      subject: owner.subject,
      email: owner.email,
      name: null,
      issuedAt: erasedAt.getTime() + SESSION_CLOCK_SKEW_MS + 1,
    });
    expect(freshId).not.toBe(owner.id);
    const [marker] = await db
      .select()
      .from(accountRevocations)
      .where(eq(accountRevocations.subjectHash, identityHash(owner.subject)));
    expect(marker?.expiresAt.getTime()).toBe(erasedAt.getTime() + 35 * 86_400_000);
    expect(await db.select().from(schema.users).where(eq(schema.users.id, other.id))).toHaveLength(
      1,
    );
  });

  it('retention dry-run preserves rows, then erases only the inactive account', async () => {
    const old = await newAccount();
    const active = await newAccount();
    const { db } = await import('../src/db/index.js');
    const { users, accounts } = await import('../src/db/schema.js');
    const { purgeInactiveAccounts } = await import('../src/services/retention.service.js');
    await db
      .update(users)
      .set({ updatedAt: new Date(Date.now() - 400 * 86_400_000) })
      .where(eq(users.id, old.id));
    const dryRun = await purgeInactiveAccounts({ days: 365 });
    expect(dryRun.dryRun).toBe(true);
    expect(dryRun.deleted).toBe(0);
    expect(await db.select().from(users).where(eq(users.id, old.id))).toHaveLength(1);
    const applied = await purgeInactiveAccounts({ days: 365, apply: true });
    expect(applied.deleted).toBeGreaterThanOrEqual(1);
    expect(await db.select().from(users).where(eq(users.id, old.id))).toHaveLength(0);
    expect(
      await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.provider, 'google'), eq(accounts.providerAccountId, old.subject))),
    ).toHaveLength(0);
    expect(await db.select().from(users).where(eq(users.id, active.id))).toHaveLength(1);
  });
});
