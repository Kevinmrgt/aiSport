import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { betaCreditAdjustments, betaTesters, users } from '../db/schema.js';
import { writeAdminAudit, type AdminTransaction } from './admin-audit.repository.js';
import { AppError } from '../types/app-error.js';

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
    await writeAdminAudit(tx, { actorEmail: input.adminEmail, userId: user.id, targetEmail: user.email,
      action: 'beta.created', reason: 'Création d’un accès bêta',
      changes: { amount: input.generationBalance, balanceAfter: input.generationBalance } });
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

export async function adjustBetaBalance(userId: string, amount: number, adminEmail: string, reason = 'Ajustement des générations bêta', requestId?: string): Promise<number | null> {
  return db.transaction(async (tx) => {
    const member = await lockedBeta(tx, userId);
    if (!member) throw AppError.notFound('Bêta-testeur');
    const key = requestId ? `beta:${userId}:${requestId}` : null;
    if (key) {
      const previous = await tx.execute(sql`SELECT actor_email,reason,changes FROM admin_audit_events WHERE request_key=${key}`);
      const old = previous.rows[0];
      if (old) {
        const changes = old['changes'] as { amount: number; balanceAfter: number };
        if (old['actor_email'] !== adminEmail || old['reason'] !== reason || changes.amount !== amount)
          throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'Cette demande a déjà été utilisée avec des valeurs différentes.');
        return changes.balanceAfter;
      }
    }
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
    await writeAdminAudit(tx, { actorEmail: adminEmail, userId, targetEmail: String(member['email']),
      action: 'beta.credits', reason, changes: { amount, balanceAfter: updated.balance }, requestKey: key });
    return updated.balance;
  });
}

async function lockedBeta(tx: AdminTransaction, userId: string) {
  const result = await tx.execute(sql`SELECT u.email,b.active,b.generation_balance FROM beta_testers b JOIN users u ON u.id=b.user_id WHERE b.user_id=${userId}::uuid FOR UPDATE OF b`);
  return result.rows[0];
}

export async function setBetaStatus(userId: string, active: boolean, sessionVersion: string, adminEmail: string, reason = 'Modification de l’accès bêta'): Promise<boolean> {
  return db.transaction(async (tx) => {
  const member = await lockedBeta(tx, userId);
  if (!member) return false;
  const result = await tx
    .update(betaTesters)
    .set({ active: active ? 1 : 0, sessionVersion, updatedAt: new Date() })
    .where(eq(betaTesters.userId, userId))
    .returning({ userId: betaTesters.userId });
  await writeAdminAudit(tx, { actorEmail: adminEmail, userId, targetEmail: String(member['email']),
    action: active ? 'beta.activated' : 'beta.deactivated', reason, changes: { before: member['active'] === 1, after: active } });
  return result.length === 1;
  });
}

export async function resetBetaPassword(userId: string, passwordHash: string, sessionVersion: string, adminEmail: string, reason = 'Réinitialisation du mot de passe bêta'): Promise<boolean> {
  return db.transaction(async (tx) => {
  const member = await lockedBeta(tx, userId);
  if (!member) return false;
  const result = await tx
    .update(betaTesters)
    .set({ passwordHash, mustChangePassword: 1, sessionVersion, updatedAt: new Date() })
    .where(eq(betaTesters.userId, userId))
    .returning({ userId: betaTesters.userId });
  await writeAdminAudit(tx, { actorEmail: adminEmail, userId, targetEmail: String(member['email']),
    action: 'beta.password_reset', reason, changes: { mustChangePassword: true, sessionsRevoked: true } });
  return result.length === 1;
  });
}

/** Retire uniquement l'accès bêta : les données utilisateur et Google éventuelles sont conservées. */
export async function deleteBetaTester(userId: string, adminEmail: string, reason = 'Retrait de l’accès bêta'): Promise<boolean> {
  return db.transaction(async (tx) => {
  const member = await lockedBeta(tx, userId);
  if (!member) return false;
  const result = await tx
    .delete(betaTesters)
    .where(eq(betaTesters.userId, userId))
    .returning({ userId: betaTesters.userId });
  await writeAdminAudit(tx, { actorEmail: adminEmail, userId, targetEmail: String(member['email']),
    action: 'beta.deleted', reason, changes: { accessRemoved: true, trainingDataPreserved: true } });
  return result.length === 1;
  });
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
