import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import type * as Database from '../src/db/index.js';
const url = process.env['TEST_DATABASE_URL'];
const userId = randomUUID(),
  oauthUserId = randomUUID();
let database: typeof Database;
let visitId: string | undefined;
describe.skipIf(!url)('restored product persistence boundaries', () => {
  beforeAll(async () => {
    const target = new URL(url!);
    if (
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      !/test|audit|^\/alcide$/.test(target.pathname)
    )
      throw new Error('Local synthetic test database required');
    process.env['DATABASE_URL'] = url;
    database = await import('../src/db/index.js');
    await database.db.execute(
      sql`INSERT INTO users(id,email) VALUES (${userId}::uuid,${userId + '@alcide.test'}),(${oauthUserId}::uuid,${oauthUserId + '@alcide.test'})`,
    );
    await database.db.execute(
      sql`INSERT INTO accounts(user_id,type,provider,provider_account_id) VALUES (${oauthUserId}::uuid,'oidc','google',${'restored-' + oauthUserId})`,
    );
  });
  afterAll(async () => {
    if (!database) return;
    if (visitId) await database.db.execute(sql`DELETE FROM page_visits WHERE id=${visitId}::uuid`);
    await database.db.execute(
      sql`DELETE FROM users WHERE id IN (${userId}::uuid,${oauthUserId}::uuid)`,
    );
    await database.pool.end();
  });
  it('serializes a persistent jury quota without granting a second slot under concurrency', async () => {
    const quota = await import('../src/repositories/generation-quota.repository.js');
    expect(await quota.getGenerationQuotaUsage(userId, 2)).toBe(0);
    const attempts = await Promise.all(
      Array.from({ length: 5 }, () => quota.reserveGenerationSlot(userId, 2)),
    );
    expect(attempts.filter(Boolean)).toHaveLength(2);
    expect(await quota.getGenerationQuotaUsage(userId, 2)).toBe(2);
    await quota.releaseGenerationSlot(userId);
    expect(await quota.getGenerationQuotaUsage(userId, 2)).toBe(1);
    await quota.releaseGenerationSlot(userId);
    await quota.releaseGenerationSlot(userId);
    expect(await quota.getGenerationQuotaUsage(userId, 2)).toBe(0);
  });
  it('persists an anonymous page visit without identity fields', async () => {
    const { recordPageVisit } = await import('../src/repositories/visitor-analytics.repository.js');
    const before = await database.db.execute(
      sql`SELECT count(*)::integer AS count FROM page_visits`,
    );
    await recordPageVisit();
    const after = await database.db.execute(
      sql`SELECT count(*)::integer AS count FROM page_visits`,
    );
    expect(after.rows[0]?.['count']).toBe(Number(before.rows[0]?.['count']) + 1);
    const visit = await database.db.execute(
      sql`SELECT * FROM page_visits ORDER BY occurred_at DESC,id DESC LIMIT 1`,
    );
    visitId = visit.rows[0]?.['id'] as string;
    expect(Object.keys(visit.rows[0]!).sort()).toEqual(['id', 'occurred_at']);
  });
  it('cannot attach a beta password to an existing Google identity by email', async () => {
    const { createBetaTester } = await import('../src/repositories/beta-tester.repository.js');
    await expect(
      createBetaTester({
        name: 'Synthetic',
        email: oauthUserId + '@alcide.test',
        passwordHash: 'never-persisted',
        generationBalance: 3,
        sessionVersion: randomUUID(),
        adminEmail: 'admin@alcide.test',
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    const identities = await database.db.execute(
      sql`SELECT provider_account_id FROM accounts WHERE user_id=${oauthUserId}::uuid`,
    );
    expect(identities.rows[0]?.['provider_account_id']).toBe('restored-' + oauthUserId);
    const beta = await database.db.execute(
      sql`SELECT count(*)::integer AS count FROM beta_testers WHERE user_id=${oauthUserId}::uuid`,
    );
    expect(beta.rows[0]?.['count']).toBe(0);
  });
});
