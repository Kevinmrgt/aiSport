import { eq, lt, asc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { accounts, users } from '../db/schema.js';
import { accountRevocations } from '../db/privacy.schema.js';
import { eraseOwnedAccount } from './account.repository.js';

export function retentionDays(value = process.env['RETENTION_INACTIVE_DAYS'] ?? '365'): number {
  if (!/^\d+$/.test(value) || Number(value) < 30 || Number(value) > 3650) {
    throw new Error('RETENTION_INACTIVE_DAYS doit etre un entier entre 30 et 3650');
  }
  return Number(value);
}

/** Dry-run is the default. No identifiers, emails or data rows leave this function. */
export async function purgeInactiveAccounts(
  options: { apply?: boolean; now?: Date; days?: number; limit?: number } = {},
) {
  const now = options.now ?? new Date();
  const days = retentionDays(String(options.days ?? retentionDays()));
  const limit = options.limit ?? 100;
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000)
    throw new Error('Limite de purge invalide');
  const cutoff = new Date(now.getTime() - days * 86_400_000);
  const candidates = await db
    .select({ id: users.id })
    .from(users)
    .where(lt(users.updatedAt, cutoff))
    .orderBy(asc(users.updatedAt), asc(users.id))
    .limit(limit);
  let deleted = 0;
  if (options.apply) {
    for (const candidate of candidates) {
      const [identity] = await db
        .select({ subject: accounts.providerAccountId, provider: accounts.provider })
        .from(accounts)
        .where(eq(accounts.userId, candidate.id))
        .limit(1);
      if (identity?.provider === 'google') {
        if (await eraseOwnedAccount(candidate.id, identity.subject, now, cutoff)) deleted += 1;
      } else {
        // Legacy unlinked cookies are already rejected by the stable identity policy.
        const removed = await db.transaction(async (tx) => {
          await tx.execute(sql`set local lock_timeout = '5s'`);
          const [current] = await tx
            .select({ updatedAt: users.updatedAt })
            .from(users)
            .where(eq(users.id, candidate.id))
            .for('update');
          if (!current || current.updatedAt >= cutoff) return false;
          // A concurrent operator linking a provider must not lose its account.
          const linked = await tx
            .select({ provider: accounts.provider })
            .from(accounts)
            .where(eq(accounts.userId, candidate.id));
          if (linked.some((account) => account.provider === 'google')) return false;
          await tx.delete(users).where(eq(users.id, candidate.id));
          return true;
        });
        if (removed) deleted += 1;
      }
    }
    await db.delete(accountRevocations).where(lt(accountRevocations.expiresAt, now));
  }
  return {
    dryRun: !options.apply,
    retentionDays: days,
    cutoff: cutoff.toISOString(),
    candidates: candidates.length,
    deleted,
    batchLimit: limit,
  };
}
