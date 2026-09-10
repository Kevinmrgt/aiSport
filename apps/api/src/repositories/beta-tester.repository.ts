import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { betaCreditAdjustments, betaTesters, users } from '../db/schema.js';

export interface BetaTesterSummary {
  userId: string;
  name: string | null;
  email: string;
  active: boolean;
  generationBalance: number;
  mustChangePassword: boolean;
  createdAt: Date;
}

export async function findBetaForAuthentication(email: string) {
  const [row] = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      passwordHash: betaTesters.passwordHash,
      active: betaTesters.active,
      mustChangePassword: betaTesters.mustChangePassword,
      sessionVersion: betaTesters.sessionVersion,
    })
    .from(betaTesters)
    .innerJoin(users, eq(users.id, betaTesters.userId))
    .where(eq(users.email, email))
    .limit(1);
  return row;
}

export async function findActiveBetaSession(userId: string, sessionVersion: string) {
  const [row] = await db
    .select({
      active: betaTesters.active,
      mustChangePassword: betaTesters.mustChangePassword,
      generationBalance: betaTesters.generationBalance,
    })
    .from(betaTesters)
    .where(and(eq(betaTesters.userId, userId), eq(betaTesters.sessionVersion, sessionVersion)))
    .limit(1);
  return row;
}

export async function findBetaByUserId(userId: string) {
  const [row] = await db
    .select({ passwordHash: betaTesters.passwordHash, active: betaTesters.active })
    .from(betaTesters)
    .where(eq(betaTesters.userId, userId))
    .limit(1);
  return row;
}

export async function listBetaTesters(): Promise<BetaTesterSummary[]> {
  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      active: betaTesters.active,
      generationBalance: betaTesters.generationBalance,
      mustChangePassword: betaTesters.mustChangePassword,
      createdAt: betaTesters.createdAt,
    })
    .from(betaTesters)
    .innerJoin(users, eq(users.id, betaTesters.userId))
    .orderBy(desc(betaTesters.createdAt));
  return rows.map((row) => ({ ...row, active: row.active === 1, mustChangePassword: row.mustChangePassword === 1 }));
}

export async function createBetaTester(input: {
  name: string;
  email: string;
  passwordHash: string;
  generationBalance: number;
  sessionVersion: string;
  adminEmail: string;
}): Promise<BetaTesterSummary> {
  return db.transaction(async (tx) => {
    const [createdUser] = await tx
      .insert(users)
      .values({ name: input.name, email: input.email })
      .onConflictDoNothing({ target: users.email })
      .returning({ id: users.id, name: users.name, email: users.email });
    let user = createdUser;
    if (!user) {
      [user] = await tx
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);
    }
    if (!user) throw new Error('Création utilisateur incomplète');
    const [beta] = await tx
      .insert(betaTesters)
      .values({
        userId: user.id,
        passwordHash: input.passwordHash,
        generationBalance: input.generationBalance,
        sessionVersion: input.sessionVersion,
      })
      .returning({ createdAt: betaTesters.createdAt });
    if (!beta) throw new Error('Création bêta incomplète');
    await tx.insert(betaCreditAdjustments).values({
      betaUserId: user.id,
      adminEmail: input.adminEmail,
      amount: input.generationBalance,
      balanceAfter: input.generationBalance,
    });
    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      active: true,
      generationBalance: input.generationBalance,
      mustChangePassword: true,
      createdAt: beta.createdAt,
    };
  });
}

export async function adjustBetaBalance(userId: string, amount: number, adminEmail: string): Promise<number | null> {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(betaTesters)
      .set({ generationBalance: sql`${betaTesters.generationBalance} + ${amount}`, updatedAt: new Date() })
      .where(and(eq(betaTesters.userId, userId), sql`${betaTesters.generationBalance} + ${amount} >= 0`))
      .returning({ balance: betaTesters.generationBalance });
    if (!updated) return null;
    await tx.insert(betaCreditAdjustments).values({
      betaUserId: userId,
      adminEmail,
      amount,
      balanceAfter: updated.balance,
    });
    return updated.balance;
  });
}

export async function setBetaStatus(userId: string, active: boolean, sessionVersion: string): Promise<boolean> {
  const result = await db
    .update(betaTesters)
    .set({ active: active ? 1 : 0, sessionVersion, updatedAt: new Date() })
    .where(eq(betaTesters.userId, userId))
    .returning({ userId: betaTesters.userId });
  return result.length === 1;
}

export async function resetBetaPassword(userId: string, passwordHash: string, sessionVersion: string): Promise<boolean> {
  const result = await db
    .update(betaTesters)
    .set({ passwordHash, mustChangePassword: 1, sessionVersion, updatedAt: new Date() })
    .where(eq(betaTesters.userId, userId))
    .returning({ userId: betaTesters.userId });
  return result.length === 1;
}

/** Retire uniquement l'accès bêta : les données utilisateur et Google éventuelles sont conservées. */
export async function deleteBetaTester(userId: string): Promise<boolean> {
  const result = await db
    .delete(betaTesters)
    .where(eq(betaTesters.userId, userId))
    .returning({ userId: betaTesters.userId });
  return result.length === 1;
}

export async function changeBetaPassword(userId: string, passwordHash: string): Promise<void> {
  await db
    .update(betaTesters)
    .set({ passwordHash, mustChangePassword: 0, updatedAt: new Date() })
    .where(eq(betaTesters.userId, userId));
}

export async function reserveBetaGeneration(userId: string) {
  const [row] = await db
    .update(betaTesters)
    .set({ generationBalance: sql`${betaTesters.generationBalance} - 1`, updatedAt: new Date() })
    .where(and(eq(betaTesters.userId, userId), eq(betaTesters.active, 1), sql`${betaTesters.generationBalance} > 0`))
    .returning({ remaining: betaTesters.generationBalance });
  return row ?? null;
}

export async function releaseBetaGeneration(userId: string): Promise<void> {
  await db
    .update(betaTesters)
    .set({ generationBalance: sql`${betaTesters.generationBalance} + 1`, updatedAt: new Date() })
    .where(eq(betaTesters.userId, userId));
}
