import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import type * as Database from '../src/db/index.js';
import type * as Admin from '../src/repositories/admin.repository.js';
import type * as Beta from '../src/services/beta-tester.service.js';
import type * as Settings from '../src/repositories/settings.repository.js';
const url = process.env['TEST_DATABASE_URL'];
let database: typeof Database, admin: typeof Admin, beta: typeof Beta, settings: typeof Settings;
const owner = randomUUID(),
  member = randomUUID(),
  actor = 'admin-integration@alcide.invalid',
  prefix = 'admin-suite-' + randomUUID().slice(0, 8),
  fixtureIds: string[] = [];
(url ? describe : describe.skip)('administration PostgreSQL', () => {
  beforeAll(async () => {
    const target = new URL(url!);
    if (
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      !(
        target.pathname.startsWith('/alcide_admin_') ||
        (process.env['CI'] === 'true' && target.pathname === '/alcide')
      )
    )
      throw new Error('Base admin locale isolée requise');
    process.env['DATABASE_URL'] = url;
    process.env['ADMIN_EMAILS'] = actor;
    database = await import('../src/db/index.js');
    admin = await import('../src/repositories/admin.repository.js');
    beta = await import('../src/services/beta-tester.service.js');
    settings = await import('../src/repositories/settings.repository.js');
    await database.db.execute(
      sql`INSERT INTO users(id,email,name) VALUES (${owner}::uuid,${actor},'Admin'),(${member}::uuid,${prefix + '@alcide.invalid'},'Élodie Test')`,
    );
    for (let i = 0; i < 27; i++) {
      const id = randomUUID();
      fixtureIds.push(id);
      await database.db.execute(
        sql`INSERT INTO users(id,email,name) VALUES (${id}::uuid,${prefix + '-' + String(i).padStart(2, '0') + '@alcide.invalid'},${'Membre ' + i})`,
      );
    }
  });
  afterAll(async () => {
    if (database) {
      await database.db.execute(
        sql`DELETE FROM users WHERE email LIKE ${prefix + '%'} OR id=${owner}::uuid`,
      );
      await database.pool.end();
    }
  });
  it('liste et filtre par pages de 25 sans créer de facturation', async () => {
    const first = await admin.listAdminMembers({ page: 1, q: prefix });
    expect(first.items).toHaveLength(25);
    expect(first.total).toBe(28);
    const second = await admin.listAdminMembers({ page: 2, q: prefix });
    expect(second.items).toHaveLength(3);
    expect(new Set([...first.items, ...second.items].map((x) => x.id)).size).toBe(28);
    const found = await admin.getAdminMember(member);
    expect(found.member.credits).toEqual({ welcome: 0, premium: 0, offered: 0 });
    const count = await database.db.execute(
      sql`SELECT count(*)::int AS total FROM billing_accounts WHERE user_id=${member}::uuid`,
    );
    expect(count.rows[0]?.['total']).toBe(0);
    expect((await admin.listAdminMembers({ page: 10, q: prefix })).total).toBe(28);
  });
  it('attribue une seule dotation malgré cinq soumissions concurrentes', async () => {
    const input = { amount: 7, reason: 'Test concurrence', requestId: randomUUID() };
    await Promise.all(
      Array.from({ length: 5 }, () => admin.grantAdminCredits(member, input, actor)),
    );
    const detail = await admin.getAdminMember(member);
    expect(detail.member.credits).toEqual({ welcome: 0, premium: 0, offered: 7 });
    const audit = await admin.listAdminAudit({
      page: 1,
      userId: member,
      action: 'credits.granted',
    });
    expect(audit.total).toBe(1);
    await expect(
      admin.grantAdminCredits(member, { ...input, amount: 8 }, actor),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
  it('consomme et restitue les crédits offerts avec le mécanisme standard', async () => {
    const userId = fixtureIds[0]!;
    const billing = await import('../src/repositories/billing.repository.js');
    await admin.grantAdminCredits(
      userId,
      { amount: 7, reason: 'Générations offertes', requestId: randomUUID() },
      actor,
    );
    expect((await admin.getAdminMember(userId)).member.credits).toEqual({
      welcome: 0,
      premium: 0,
      offered: 7,
    });
    const reservation = await billing.reserveCredits(userId, 10);
    expect((await billing.readBillingStatus(userId)).remaining).toBe(0);
    await billing.releaseCredits(userId, reservation);
    await billing.releaseCredits(userId, reservation);
    expect(await billing.readBillingStatus(userId)).toMatchObject({
      remaining: 10,
      offeredCredits: 7,
      freeCredits: 10,
    });
    const consumed = await billing.reserveCredits(userId, 10);
    await billing.persistWithCredits(userId, consumed, () => Promise.resolve('contenu sauvegardé'));
    await billing.releaseCredits(userId, consumed);
    expect((await billing.readBillingStatus(userId)).remaining).toBe(0);
    expect((await admin.listAdminAudit({ page: 1, userId, action: 'credits.granted' })).total).toBe(
      1,
    );
  });
  it('suspend, réactive et protège les administrateurs', async () => {
    await expect(
      admin.suspendAdminMember(owner, true, 'Test protection', actor),
    ).rejects.toMatchObject({ statusCode: 403 });
    await admin.suspendAdminMember(member, true, 'Test suspension', actor);
    expect((await admin.getAdminMember(member)).member.suspendedAt).not.toBeNull();
    expect((await admin.listAdminMembers({ page: 1, suspended: 'yes', q: prefix })).total).toBe(1);
    await admin.suspendAdminMember(member, false, 'Test réactivation', actor);
    expect((await admin.getAdminMember(member)).member.suspendedAt).toBeNull();
    expect(
      (await admin.listAdminAudit({ page: 1, userId: member, action: 'member.suspended' })).total,
    ).toBe(1);
  });
  it('conserve les invariants bêta, révoque les sessions et garde le journal après retrait', async () => {
    const created = await beta.createManagedBetaTester({
      email: prefix + '@alcide.invalid',
      name: 'Élodie',
      generationBalance: 2,
      adminEmail: actor,
    });
    expect(created.beta.userId).toBe(member);
    const identity = await beta.authorizeBeta(
      prefix + '@alcide.invalid',
      created.temporaryPassword,
    );
    expect(identity).not.toBeNull();
    const key = randomUUID();
    await Promise.all([
      beta.adjustManagedBetaBalance(member, 3, actor, 'Test ajout', key),
      beta.adjustManagedBetaBalance(member, 3, actor, 'Test ajout', key),
    ]);
    expect((await admin.getAdminMember(member)).member.beta?.remaining).toBe(5);
    const withdrawal = await Promise.allSettled([
      beta.adjustManagedBetaBalance(member, -4, actor),
      beta.adjustManagedBetaBalance(member, -4, actor),
    ]);
    expect(withdrawal.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect((await admin.getAdminMember(member)).member.beta?.remaining).toBe(1);
    const reset = await beta.resetManagedBetaPassword(member, actor);
    expect(reset).toBeTruthy();
    await expect(
      beta.assertActiveBetaSession(member, identity!.betaSessionVersion),
    ).rejects.toMatchObject({ statusCode: 401 });
    await beta.setManagedBetaStatus(member, false, actor);
    expect(await beta.authorizeBeta(prefix + '@alcide.invalid', reset)).toBeNull();
    await beta.setManagedBetaStatus(member, true, actor);
    expect(await beta.authorizeBeta(prefix + '@alcide.invalid', reset)).not.toBeNull();
    await beta.deleteManagedBetaTester(member, actor);
    const detail = await admin.getAdminMember(member);
    expect(detail.member.beta).toBeNull();
    expect(detail.member.credits.offered).toBe(7);
    const log = await admin.listAdminAudit({ page: 1, userId: member });
    expect(log.items.some((x) => x.action === 'beta.deleted')).toBe(true);
    expect(log.items.some((x) => x.action === 'beta.created')).toBe(true);
    const text = JSON.stringify(log);
    expect(text).not.toContain(reset);
    expect(text).not.toContain('passwordHash');
    expect(
      (await admin.listAdminCredits({ page: 1, userId: member })).items.filter(
        (x) => x.kind === 'beta',
      ),
    ).toHaveLength(3);
  });
  it('annule la dotation si son journal ne peut pas être enregistré', async () => {
    await database.db.execute(
      sql`CREATE FUNCTION admin_test_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.reason='reject_audit' THEN RAISE EXCEPTION 'test audit failure'; END IF; RETURN NEW; END $$`,
    );
    await database.db.execute(
      sql`CREATE TRIGGER admin_test_reject BEFORE INSERT ON admin_audit_events FOR EACH ROW EXECUTE FUNCTION admin_test_reject_audit()`,
    );
    try {
      await expect(
        admin.grantAdminCredits(
          member,
          { amount: 9, reason: 'reject_audit', requestId: randomUUID() },
          actor,
        ),
      ).rejects.toThrow();
      expect((await admin.getAdminMember(member)).member.credits.offered).toBe(7);
    } finally {
      await database.db.execute(sql`DROP TRIGGER admin_test_reject ON admin_audit_events`);
      await database.db.execute(sql`DROP FUNCTION admin_test_reject_audit()`);
    }
  });
  it('journalise les réglages dans leur transaction et expose toutes les lectures', async () => {
    await settings.upsertPlatformSettings(
      { defaultAiModel: 'gpt-5.4-mini', defaultBetaGenerationBalance: 12 },
      actor,
    );
    const audit = await admin.listAdminAudit({ page: 1, action: 'platform.settings', actor });
    expect(audit.items[0]?.changes['after']).toEqual({
      defaultAiModel: 'gpt-5.4-mini',
      defaultBetaGenerationBalance: 12,
    });
    expect((await admin.getAdminSummary()).totalUsers).toBeGreaterThanOrEqual(29);
    expect((await admin.listAdminSubscriptions({ page: 1, userId: member })).items).toEqual([]);
    for (const kind of ['workouts', 'programs'] as const) {
      expect((await admin.listAdminContents(kind, { page: 1, userId: member })).items).toEqual([]);
      await expect(admin.getAdminContent(kind, randomUUID())).rejects.toMatchObject({
        statusCode: 404,
      });
    }
  });
});
