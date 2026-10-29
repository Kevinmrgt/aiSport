import { and, eq, notExists, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { accounts, users } from '../db/schema.js';
import { AppError } from '../types/app-error.js';
import { assertGoogleSessionActive } from '../services/account-session.service.js';

export interface GoogleIdentity {
  subject: string;
  email: string;
  name: string | null;
  issuedAt?: number;
}

/** The provider subject is the identity; an e-mail address is only contact data. */
export async function resolveGoogleIdentity(identity: GoogleIdentity): Promise<string> {
  return db.transaction(async (tx) => {
    // Shared by all API instances, including concurrent first connections.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`google:${identity.subject}`}, 0))`,
    );
    if (identity.issuedAt !== undefined) {
      await assertGoogleSessionActive(identity.subject, identity.issuedAt, tx);
    }
    const [linked] = await tx
      .select({ userId: accounts.userId })
      .from(accounts)
      .where(and(eq(accounts.provider, 'google'), eq(accounts.providerAccountId, identity.subject)))
      .limit(1);
    if (linked) {
      await tx
        .update(users)
        .set({ email: identity.email, name: identity.name, updatedAt: new Date() })
        .where(eq(users.id, linked.userId));
      return linked.userId;
    }

    // Historical rows have no trustworthy provider subject. Never silently claim them by email.
    const [legacy] = await tx
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          sql`lower(${users.email}) = lower(${identity.email})`,
          notExists(
            tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, users.id)),
          ),
        ),
      )
      .limit(1);
    if (legacy) {
      throw new AppError(
        409,
        'IDENTITY_LINK_REQUIRED',
        'Votre ancien compte doit être rapproché par le responsable du service avant cette connexion.',
      );
    }

    const [created] = await tx
      .insert(users)
      .values({ email: identity.email, name: identity.name })
      .returning({ id: users.id });
    if (!created) throw AppError.internal("Impossible de résoudre l'utilisateur");
    await tx.insert(accounts).values({
      userId: created.id,
      type: 'oidc',
      provider: 'google',
      providerAccountId: identity.subject,
    });
    return created.id;
  });
}

/** Operator-only migration: the caller must verify the subject with the account owner first. */
export async function linkLegacyGoogleIdentity(
  mapping: { userId: string; subject: string; expectedEmail: string },
  apply: boolean,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`google:${mapping.subject}`}, 0))`,
    );
    const [user] = await tx
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, mapping.userId))
      .for('update');
    if (!user || user.email !== mapping.expectedEmail) {
      throw new Error('Mapping refusé : utilisateur ou adresse attendue ne correspond pas');
    }
    const linked = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.userId, mapping.userId));
    const existingSubject = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.provider, 'google'), eq(accounts.providerAccountId, mapping.subject)));
    if (linked.length || existingSubject.length)
      throw new Error('Mapping refusé : identité déjà liée');
    if (apply)
      await tx.insert(accounts).values({
        userId: mapping.userId,
        type: 'oidc',
        provider: 'google',
        providerAccountId: mapping.subject,
      });
  });
}
