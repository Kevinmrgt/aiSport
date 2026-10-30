import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq, inArray, sql } from 'drizzle-orm';
import type { GoogleIdentity } from '../src/repositories/identity.repository.js';

const databaseUrl = process.env['TEST_DATABASE_URL'];
const originalDatabaseUrl = process.env['DATABASE_URL'];
const originalRevocationSecret = process.env['PRIVACY_REVOCATION_SECRET'];
const ownedEmails: string[] = [];
const ownedSubjects: string[] = [];
let initialized = false;

describe.skipIf(!databaseUrl)('one-off admin Google binding against PostgreSQL', () => {
  beforeAll(async () => {
    const target = new URL(databaseUrl!);
    if (
      !['postgres:', 'postgresql:'].includes(target.protocol) ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) ||
      !/test|audit/i.test(target.pathname)
    )
      throw new Error('An explicit loopback test/audit database is required');
    process.env['DATABASE_URL'] = databaseUrl;
    process.env['PRIVACY_REVOCATION_SECRET'] = `admin-claim-${randomUUID()}`;
    const { db } = await import('../src/db/index.js');
    await db.execute(sql`select 1`);
    initialized = true;
  });

  beforeEach(() => {
    vi.stubEnv('PRODUCTION_ACCESS_MODE', 'admin-only');
    vi.stubEnv('ADMIN_EMAILS', '');
    vi.stubEnv('BOOTSTRAP_ADMIN_USER_ID', undefined);
  });

  afterEach(async () => {
    if (initialized) {
      const { db } = await import('../src/db/index.js');
      const { users } = await import('../src/db/schema.js');
      const { accountRevocations } = await import('../src/db/privacy.schema.js');
      const { identityHash } = await import('../src/services/account-session.service.js');
      if (ownedEmails.length)
        await db.delete(users).where(inArray(sql`lower(${users.email})`, ownedEmails));
      if (ownedSubjects.length)
        await db
          .delete(accountRevocations)
          .where(inArray(accountRevocations.subjectHash, ownedSubjects.map(identityHash)));
      ownedEmails.length = 0;
      ownedSubjects.length = 0;
    }
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    if (initialized) {
      const { pool } = await import('../src/db/index.js');
      await pool.end();
    }
    if (originalDatabaseUrl === undefined) delete process.env['DATABASE_URL'];
    else process.env['DATABASE_URL'] = originalDatabaseUrl;
    if (originalRevocationSecret === undefined) delete process.env['PRIVACY_REVOCATION_SECRET'];
    else process.env['PRIVACY_REVOCATION_SECRET'] = originalRevocationSecret;
  });

  async function seedUser() {
    const { db } = await import('../src/db/index.js');
    const { users } = await import('../src/db/schema.js');
    const id = randomUUID();
    const email = `admin-claim-${randomUUID()}@audit.invalid`;
    ownedEmails.push(email);
    await db.insert(users).values({ id, email, name: 'Imported admin profile' });
    return { id, email };
  }

  function identity(email: string): GoogleIdentity {
    const subject = `admin-claim-${randomUUID()}`;
    ownedSubjects.push(subject);
    return { subject, email, name: 'Google profile', issuedAt: Date.now(), verifiedEmail: true };
  }

  async function fixture() {
    const user = await seedUser();
    vi.stubEnv('ADMIN_EMAILS', user.email);
    vi.stubEnv('BOOTSTRAP_ADMIN_USER_ID', user.id);
    return { ...user, login: identity(user.email) };
  }

  async function counts(email: string) {
    const { db } = await import('../src/db/index.js');
    const { users, accounts } = await import('../src/db/schema.js');
    const [row] = await db
      .select({
        users: sql<number>`count(distinct ${users.id})::int`,
        accounts: sql<number>`count(${accounts.id})::int`,
      })
      .from(users)
      .leftJoin(accounts, eq(accounts.userId, users.id))
      .where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
    return row;
  }

  it('binds only the seeded UUID, preserves its imported profile, and repeats idempotently', async () => {
    const seed = await fixture();
    vi.stubEnv('ADMIN_EMAILS', ` ${seed.email.toUpperCase()} `);
    const { resolveGoogleIdentity } = await import('../src/repositories/identity.repository.js');
    expect(await resolveGoogleIdentity(seed.login)).toBe(seed.id);
    const { db } = await import('../src/db/index.js');
    const { users } = await import('../src/db/schema.js');
    expect(
      (await db.select({ name: users.name }).from(users).where(eq(users.id, seed.id)))[0]?.name,
    ).toBe('Imported admin profile');
    expect(await resolveGoogleIdentity({ ...seed.login })).toBe(seed.id);
    expect(await counts(seed.email)).toEqual({ users: 1, accounts: 1 });
  });

  it('serializes two different Google subjects into one winner and no second admin', async () => {
    const seed = await fixture();
    const { resolveGoogleIdentity } = await import('../src/repositories/identity.repository.js');
    const results = await Promise.allSettled([
      resolveGoogleIdentity(seed.login),
      resolveGoogleIdentity(identity(seed.email)),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const winner = results.find((result) => result.status === 'fulfilled');
    expect(winner?.status === 'fulfilled' && winner.value).toBe(seed.id);
    expect(await counts(seed.email)).toEqual({ users: 1, accounts: 1 });
  });

  it('allows concurrent retries of the same subject without duplicate accounts', async () => {
    const seed = await fixture();
    const { resolveGoogleIdentity } = await import('../src/repositories/identity.repository.js');
    expect(
      await Promise.all([
        resolveGoogleIdentity(seed.login),
        resolveGoogleIdentity({ ...seed.login }),
      ]),
    ).toEqual([seed.id, seed.id]);
    expect(await counts(seed.email)).toEqual({ users: 1, accounts: 1 });
  });

  it.each(['malformed', 'missing', 'other-user'])(
    'refuses a %s configured UUID without fallback creation',
    async (kind) => {
      const seed = await fixture();
      const wrongId =
        kind === 'malformed'
          ? 'not-a-uuid'
          : kind === 'missing'
            ? randomUUID()
            : (await seedUser()).id;
      vi.stubEnv('BOOTSTRAP_ADMIN_USER_ID', wrongId);
      const { resolveGoogleIdentity } = await import('../src/repositories/identity.repository.js');
      await expect(resolveGoogleIdentity(seed.login)).rejects.toMatchObject({ statusCode: 403 });
      expect(await counts(seed.email)).toEqual({ users: 1, accounts: 0 });
    },
  );

  it.each([false, undefined])(
    'refuses an unverified or old session proof (%s)',
    async (verifiedEmail) => {
      const seed = await fixture();
      const { resolveGoogleIdentity } = await import('../src/repositories/identity.repository.js');
      await expect(resolveGoogleIdentity({ ...seed.login, verifiedEmail })).rejects.toMatchObject({
        statusCode: 403,
      });
      expect(await counts(seed.email)).toEqual({ users: 1, accounts: 0 });
    },
  );

  it.each([undefined, Date.now() - 40 * 24 * 60 * 60 * 1000])(
    'requires a recent session issue time (%s)',
    async (issuedAt) => {
      const seed = await fixture();
      const { resolveGoogleIdentity } = await import('../src/repositories/identity.repository.js');
      await expect(resolveGoogleIdentity({ ...seed.login, issuedAt })).rejects.toMatchObject({
        statusCode: 401,
      });
      expect(await counts(seed.email)).toEqual({ users: 1, accounts: 0 });
    },
  );

  it('refuses revoked Google sessions even with a verified admin email', async () => {
    const seed = await fixture();
    const { db } = await import('../src/db/index.js');
    const { accountRevocations } = await import('../src/db/privacy.schema.js');
    const { identityHash } = await import('../src/services/account-session.service.js');
    await db.insert(accountRevocations).values({
      subjectHash: identityHash(seed.login.subject),
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
    });
    const { resolveGoogleIdentity } = await import('../src/repositories/identity.repository.js');
    await expect(resolveGoogleIdentity(seed.login)).rejects.toMatchObject({ statusCode: 401 });
    expect(await counts(seed.email)).toEqual({ users: 1, accounts: 0 });
  });

  it('keeps legacy email-only binding forbidden in public mode or without explicit UUID', async () => {
    const seed = await fixture();
    const { resolveGoogleIdentity } = await import('../src/repositories/identity.repository.js');
    vi.stubEnv('PRODUCTION_ACCESS_MODE', 'public');
    await expect(resolveGoogleIdentity(seed.login)).rejects.toMatchObject({
      code: 'IDENTITY_LINK_REQUIRED',
    });
    vi.stubEnv('PRODUCTION_ACCESS_MODE', 'admin-only');
    vi.stubEnv('BOOTSTRAP_ADMIN_USER_ID', undefined);
    await expect(resolveGoogleIdentity(seed.login)).rejects.toMatchObject({
      code: 'IDENTITY_LINK_REQUIRED',
    });
    expect(await counts(seed.email)).toEqual({ users: 1, accounts: 0 });
  });

  it('does not claim another legacy user or accept multiple configured admin emails', async () => {
    const seed = await fixture();
    const other = await seedUser();
    const { resolveGoogleIdentity } = await import('../src/repositories/identity.repository.js');
    await expect(resolveGoogleIdentity(identity(other.email))).rejects.toMatchObject({
      statusCode: 403,
    });
    vi.stubEnv('ADMIN_EMAILS', `${seed.email},${other.email}`);
    await expect(resolveGoogleIdentity(seed.login)).rejects.toMatchObject({ statusCode: 403 });
    expect(await counts(seed.email)).toEqual({ users: 1, accounts: 0 });
    expect(await counts(other.email)).toEqual({ users: 1, accounts: 0 });
  });

  it.each(['google', 'credentials'])(
    'does not replace an existing %s account on the seeded admin',
    async (provider) => {
      const seed = await fixture();
      const { db } = await import('../src/db/index.js');
      const { accounts } = await import('../src/db/schema.js');
      await db.insert(accounts).values({
        userId: seed.id,
        provider,
        type: 'oidc',
        providerAccountId: `existing-${randomUUID()}`,
      });
      const { resolveGoogleIdentity } = await import('../src/repositories/identity.repository.js');
      await expect(resolveGoogleIdentity(seed.login)).rejects.toMatchObject({ statusCode: 403 });
      expect(await counts(seed.email)).toEqual({ users: 1, accounts: 1 });
    },
  );

  it('does not move a Google subject already owned by another UUID or update that owner', async () => {
    const seed = await fixture();
    const other = await seedUser();
    const { db } = await import('../src/db/index.js');
    const { accounts, users } = await import('../src/db/schema.js');
    await db.insert(accounts).values({
      userId: other.id,
      provider: 'google',
      type: 'oidc',
      providerAccountId: seed.login.subject,
    });
    const { resolveGoogleIdentity } = await import('../src/repositories/identity.repository.js');
    await expect(resolveGoogleIdentity(seed.login)).rejects.toMatchObject({ statusCode: 403 });
    expect(
      (await db.select({ email: users.email }).from(users).where(eq(users.id, other.id)))[0]?.email,
    ).toBe(other.email);
    expect(await counts(seed.email)).toEqual({ users: 1, accounts: 0 });
    expect(await counts(other.email)).toEqual({ users: 1, accounts: 1 });
  });
});
