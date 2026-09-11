import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import type * as BillingRepository from '../src/repositories/billing.repository.js';
import type * as Database from '../src/db/index.js';
const databaseUrl = process.env['TEST_DATABASE_URL'];
const suite = databaseUrl ? describe : describe.skip;
const userId = randomUUID();
let repo: typeof BillingRepository;
let database: typeof Database;
suite('facturation PostgreSQL', () => {
  beforeAll(async () => {
    if (!databaseUrl || !['localhost', '127.0.0.1'].includes(new URL(databaseUrl).hostname))
      throw new Error('Base de test locale requise');
    process.env['DATABASE_URL'] = databaseUrl;
    database = await import('../src/db/index.js');
    repo = await import('../src/repositories/billing.repository.js');
    await database.db.execute(
      sql`INSERT INTO users(id,email) VALUES (${userId}::uuid,${'billing-' + userId + '@alcide.invalid'})`,
    );
  });
  afterAll(async () => {
    if (database) {
      await database.db.execute(sql`DELETE FROM users WHERE id=${userId}::uuid`);
      await database.pool.end();
    }
  });
  it('attribue trois crédits une seule fois malgré des premières connexions concurrentes', async () => {
    const statuses = await Promise.all(
      Array.from({ length: 5 }, () => repo.readBillingStatus(userId)),
    );
    expect(statuses.every((s) => s.remaining === 3)).toBe(true);
    const grants = await database.db.execute(
      sql`SELECT COUNT(*)::integer AS count FROM billing_credit_grants WHERE user_id=${userId}::uuid`,
    );
    expect(grants.rows[0]?.['count']).toBe(1);
  });
  it('interdit le dépassement concurrent et ne restitue chaque réservation qu’une fois', async () => {
    const attempts = await Promise.allSettled(
      Array.from({ length: 5 }, () => repo.reserveCredits(userId, 1)),
    );
    expect(attempts.filter((x) => x.status === 'fulfilled')).toHaveLength(3);
    expect((await repo.readBillingStatus(userId)).remaining).toBe(0);
    for (const attempt of attempts)
      if (attempt.status === 'fulfilled') {
        await repo.releaseCredits(userId, attempt.value);
        await repo.releaseCredits(userId, attempt.value);
      }
    expect((await repo.readBillingStatus(userId)).remaining).toBe(3);
  });
  it('ne sauvegarde rien si la transaction échoue et peut restituer les crédits', async () => {
    const id = await repo.reserveCredits(userId, 2);
    await expect(
      repo.persistWithCredits(userId, id, async (tx) => {
        await tx.execute(sql`UPDATE users SET name='must rollback' WHERE id=${userId}::uuid`);
        throw new Error('save failed');
      }),
    ).rejects.toThrow('save failed');
    const result = await database.db.execute(sql`SELECT name FROM users WHERE id=${userId}::uuid`);
    expect(result.rows[0]?.['name']).toBe(null);
    await repo.releaseCredits(userId, id);
    expect((await repo.readBillingStatus(userId)).remaining).toBe(3);
  });
  it('confirme ensemble la sauvegarde et le débit, sans remboursement après succès', async () => {
    const id = await repo.reserveCredits(userId, 1);
    await repo.persistWithCredits(userId, id, async (tx) =>
      tx.execute(sql`UPDATE users SET name='saved' WHERE id=${userId}::uuid`),
    );
    await repo.releaseCredits(userId, id);
    expect((await repo.readBillingStatus(userId)).remaining).toBe(2);
  });
  it('récupère une réservation abandonnée sans autoriser une sauvegarde tardive', async () => {
    const id = await repo.reserveCredits(userId, 1);
    await database.db.execute(
      sql`UPDATE billing_credit_reservations SET created_at=now()-interval '11 minutes' WHERE id=${id}::uuid`,
    );
    expect((await repo.readBillingStatus(userId)).remaining).toBe(2);
    await expect(repo.persistWithCredits(userId, id, () => Promise.resolve(true))).rejects.toMatchObject({
      statusCode: 503,
    });
  });
  it('utilise Premium avant le gratuit, expire les anciens crédits et ne reporte pas les remboursements', async () => {
    const sub = 'sub_fixture_' + userId;
    await database.db.execute(
      sql`INSERT INTO billing_subscriptions(id,user_id,status,period_end) VALUES (${sub},${userId}::uuid,'active',now()+interval '1 month')`,
    );
    await database.db
      .execute(sql`INSERT INTO billing_credit_grants(user_id,source_key,subscription_id,amount,remaining,expires_at)
      VALUES (${userId}::uuid,${'month1:' + userId},${sub},30,30,now()+interval '1 month')`);
    const reservation = await repo.reserveCredits(userId, 4);
    expect(await repo.readBillingStatus(userId)).toMatchObject({
      plan: 'premium',
      premiumCredits: 26,
      freeCredits: 2,
    });
    await database.db
      .execute(sql`UPDATE billing_credit_grants SET starts_at=now()-interval '2 months',expires_at=now()-interval '1 month'
      WHERE source_key=${'month1:' + userId}`);
    await database.db
      .execute(sql`INSERT INTO billing_credit_grants(user_id,source_key,subscription_id,amount,remaining,expires_at)
      VALUES (${userId}::uuid,${'month2:' + userId},${sub},30,30,now()+interval '1 month')`);
    await repo.releaseCredits(userId, reservation);
    expect(await repo.readBillingStatus(userId)).toMatchObject({
      premiumCredits: 30,
      freeCredits: 2,
    });
    await database.db.execute(
      sql`UPDATE billing_subscriptions SET cancel_at_period_end=true WHERE id=${sub}`,
    );
    expect(await repo.readBillingStatus(userId)).toMatchObject({
      plan: 'premium',
      cancelAtPeriodEnd: true,
    });
    await database.db.execute(
      sql`UPDATE billing_subscriptions SET status='canceled' WHERE id=${sub}`,
    );
    expect(await repo.readBillingStatus(userId)).toMatchObject({
      plan: 'free',
      premiumCredits: 0,
      freeCredits: 2,
      canSubscribe: true,
    });
  });
});
