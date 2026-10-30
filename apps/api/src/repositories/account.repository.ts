import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  accounts,
  users,
  workouts,
  trainingPrograms,
  sessionLogs,
  userSettings,
  generationQuotas,
  sessions,
  billingAccounts,
  billingSubscriptions,
  billingCreditGrants,
  billingCreditReservations,
  betaTesters,
  betaCreditAdjustments,
} from '../db/schema.js';
import { accountRevocations } from '../db/privacy.schema.js';
import {
  generationDailyBudgets,
  generationOperations,
  generationUsageEvents,
} from '../db/generation-budget.schema.js';
import { identityHash, REVOCATION_RETENTION_MS } from '../services/account-session.service.js';
import { AppError } from '../types/app-error.js';

export async function exportOwnedAccount(userId: string) {
  return db.transaction(
    async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, userId));
      if (!user) throw AppError.notFound('Compte');
      const identities = await tx
        .select({ provider: accounts.provider, subject: accounts.providerAccountId })
        .from(accounts)
        .where(eq(accounts.userId, userId));
      // OAuth credentials and obsolete encrypted API keys are never exported to a browser.
      const settings = await tx
        .select({
          aiProvider: userSettings.aiProvider,
          aiModel: userSettings.aiModel,
          createdAt: userSettings.createdAt,
          updatedAt: userSettings.updatedAt,
        })
        .from(userSettings)
        .where(eq(userSettings.userId, userId));
      return {
        formatVersion: 1,
        billingAccounts: await tx
          .select()
          .from(billingAccounts)
          .where(eq(billingAccounts.userId, userId)),
        billingSubscriptions: await tx
          .select()
          .from(billingSubscriptions)
          .where(eq(billingSubscriptions.userId, userId)),
        billingCreditGrants: await tx
          .select()
          .from(billingCreditGrants)
          .where(eq(billingCreditGrants.userId, userId)),
        billingCreditReservations: await tx
          .select()
          .from(billingCreditReservations)
          .where(eq(billingCreditReservations.userId, userId)),
        betaAccess: await tx
          .select({
            generationBalance: betaTesters.generationBalance,
            active: betaTesters.active,
            createdAt: betaTesters.createdAt,
            updatedAt: betaTesters.updatedAt,
          })
          .from(betaTesters)
          .where(eq(betaTesters.userId, userId)),
        betaCreditAdjustments: await tx
          .select({
            amount: betaCreditAdjustments.amount,
            balanceAfter: betaCreditAdjustments.balanceAfter,
            createdAt: betaCreditAdjustments.createdAt,
          })
          .from(betaCreditAdjustments)
          .where(eq(betaCreditAdjustments.betaUserId, userId)),
        exportedAt: new Date().toISOString(),
        user,
        identities,
        sessions: await tx
          .select({ id: sessions.id, expires: sessions.expires })
          .from(sessions)
          .where(eq(sessions.userId, userId)),
        workouts: await tx.select().from(workouts).where(eq(workouts.userId, userId)),
        programs: await tx
          .select()
          .from(trainingPrograms)
          .where(eq(trainingPrograms.userId, userId)),
        sessionLogs: await tx.select().from(sessionLogs).where(eq(sessionLogs.userId, userId)),
        settings,
        legacyGenerationQuota: await tx
          .select()
          .from(generationQuotas)
          .where(eq(generationQuotas.userId, userId)),
        generationOperations: await tx
          .select({
            id: generationOperations.id,
            operationKey: generationOperations.operationKey,
            kind: generationOperations.kind,
            status: generationOperations.status,
            resourceId: generationOperations.resourceId,
            attempts: generationOperations.attempts,
            reservedTokens: generationOperations.reservedTokens,
            inputTokens: generationOperations.inputTokens,
            outputTokens: generationOperations.outputTokens,
            createdAt: generationOperations.createdAt,
            updatedAt: generationOperations.updatedAt,
          })
          .from(generationOperations)
          .where(eq(generationOperations.userId, userId)),
        generationDailyBudgets: await tx
          .select({
            day: generationDailyBudgets.day,
            attempts: generationDailyBudgets.attempts,
            reservedTokens: generationDailyBudgets.reservedTokens,
            inputTokens: generationDailyBudgets.inputTokens,
            outputTokens: generationDailyBudgets.outputTokens,
            updatedAt: generationDailyBudgets.updatedAt,
          })
          .from(generationDailyBudgets)
          .where(eq(generationDailyBudgets.userId, userId)),
        generationUsage: await tx
          .select({
            operationId: generationUsageEvents.operationId,
            model: generationUsageEvents.model,
            inputTokens: generationUsageEvents.inputTokens,
            outputTokens: generationUsageEvents.outputTokens,
            totalTokens: generationUsageEvents.totalTokens,
            createdAt: generationUsageEvents.createdAt,
          })
          .from(generationUsageEvents)
          .innerJoin(
            generationOperations,
            eq(generationUsageEvents.operationId, generationOperations.id),
          )
          .where(eq(generationOperations.userId, userId)),
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}

/** The same subject lock as authentication prevents recreation by an in-flight old session. */
export async function eraseOwnedAccount(
  userId: string,
  subject: string,
  now = new Date(),
  inactiveBefore?: Date,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local lock_timeout = '5s'`);
    await tx.execute(sql`set local statement_timeout = '10s'`);
    const identities = await tx
      .select({ subject: accounts.providerAccountId, provider: accounts.provider })
      .from(accounts)
      .where(eq(accounts.userId, userId));
    const googleSubjects = [
      ...new Set(
        identities
          .filter((identity) => identity.provider === 'google')
          .map((identity) => identity.subject),
      ),
    ].sort();
    if (!googleSubjects.includes(subject))
      throw AppError.forbidden('Cette identité ne correspond pas au compte');
    // Lock all linked subjects in one order, including historical aliases.
    for (const linkedSubject of googleSubjects) {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`google:${linkedSubject}`}, 0))`,
      );
    }
    const [user] = await tx
      .select({ updatedAt: users.updatedAt })
      .from(users)
      .where(eq(users.id, userId))
      .for('update');
    if (!user || (inactiveBefore && user.updatedAt >= inactiveBefore)) return false;
    await tx
      .insert(accountRevocations)
      .values(
        googleSubjects.map((linkedSubject) => ({
          subjectHash: identityHash(linkedSubject),
          revokedAt: now,
          expiresAt: new Date(now.getTime() + REVOCATION_RETENTION_MS),
        })),
      )
      .onConflictDoUpdate({
        target: accountRevocations.subjectHash,
        set: {
          revokedAt: now,
          expiresAt: new Date(now.getTime() + REVOCATION_RETENTION_MS),
        },
      });
    await tx.delete(users).where(eq(users.id, userId));
    return true;
  });
}
