import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import type * as Database from '../src/db/index.js';
import type * as Repository from '../src/repositories/incident.repository.js';
import { sanitizeIncident } from '../src/services/incident.service.js';
const url = process.env['TEST_DATABASE_URL'];
let database: typeof Database, repository: typeof Repository;
const requestId = randomUUID();
const actor = 'incidents-integration@alcide.invalid';
(url ? describe : describe.skip)('incidents PostgreSQL', () => {
  beforeAll(async () => {
    const target = new URL(url!);
    if (
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      !(
        target.pathname.startsWith('/alcide_admin_') ||
        target.pathname === '/alcide_restore_test' ||
        target.pathname === '/alcide_pilot_qualification_test' ||
        (process.env['CI'] === 'true' && ['/alcide', '/alcide_test'].includes(target.pathname))
      )
    )
      throw new Error('Base locale dédiée requise');
    process.env['DATABASE_URL'] = url;
    database = await import('../src/db/index.js');
    repository = await import('../src/repositories/incident.repository.js');
    await database.db.execute(sql`DELETE FROM incidents`);
  });
  afterAll(async () => {
    if (!database) return;
    await database.db.execute(sql`DELETE FROM incidents`);
    await database.db.execute(sql`DELETE FROM admin_audit_events WHERE actor_email=${actor}`);
    await database.pool.end();
  });
  it('aggregates concurrent occurrences, filters, audits status and reopens recurrence', async () => {
    const input = sanitizeIncident({
      source: 'ai',
      code: 'AI_PROVIDER_ERROR',
      route: '/workouts/generate',
      method: 'POST',
      statusCode: 503,
      lastRequestId: requestId,
    });
    await Promise.all(Array.from({ length: 8 }, () => repository.recordIncident(input)));
    const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(new Date());
    const result = await repository.listAdminIncidents({
      page: 1,
      source: 'ai',
      severity: 'error',
      status: 'new',
      q: requestId,
      from: day,
      to: day,
    });
    expect(result.total).toBe(1);
    expect(result.items[0]?.occurrenceCount).toBe(8);
    const id = result.items[0]!.id;
    expect((await repository.updateAdminIncident(id, 'in_progress', actor)).status).toBe(
      'in_progress',
    );
    expect((await repository.updateAdminIncident(id, 'resolved', actor)).status).toBe('resolved');
    await repository.recordIncident(input);
    expect(
      (await repository.listAdminIncidents({ page: 1, status: 'new', q: 'AI_PROVIDER' })).items[0]
        ?.occurrenceCount,
    ).toBe(9);
    const audit = await database.db.execute(
      sql`SELECT changes FROM admin_audit_events WHERE actor_email=${actor} AND action='incident.status_changed'`,
    );
    expect(audit.rows).toHaveLength(2);
    await expect(
      repository.updateAdminIncident(randomUUID(), 'resolved', actor),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect((await repository.listAdminIncidents({ page: 2 })).items).toEqual([]);
    expect((await repository.listAdminIncidents({ page: 1, source: 'web' })).total).toBe(0);
  });
  it('filters by the Paris calendar date shown in the admin at midnight', async () => {
    const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(new Date());
    const input = sanitizeIncident({
      source: 'web',
      code: 'WEB_REACT_BOUNDARY',
      route: '/admin/erreurs',
      method: 'BROWSER',
      lastRequestId: randomUUID(),
    });
    await repository.recordIncident(input);
    await database.db.execute(
      sql`UPDATE incidents SET last_seen_at=(${day}::date::timestamp AT TIME ZONE 'Europe/Paris') + interval '30 minutes' WHERE fingerprint=${input.fingerprint}`,
    );
    expect(
      (
        await repository.listAdminIncidents({
          page: 1,
          from: day,
          to: day,
          q: input.lastRequestId!,
        })
      ).total,
    ).toBe(1);
    await database.db.execute(
      sql`UPDATE incidents SET last_seen_at=(${day}::date::timestamp AT TIME ZONE 'Europe/Paris') - interval '30 minutes' WHERE fingerprint=${input.fingerprint}`,
    );
    expect(
      (
        await repository.listAdminIncidents({
          page: 1,
          from: day,
          to: day,
          q: input.lastRequestId!,
        })
      ).total,
    ).toBe(0);
  });
  it('bounds groups, hides expired records and resets expired recurrence', async () => {
    await database.db
      .execute(sql`INSERT INTO incidents(fingerprint,source,severity,code,route,method,last_seen_at)
      SELECT 'synthetic-cap-'||n,'api','warning','INTERNAL_ERROR','/settings','GET',now()-interval '1 day'
      FROM generate_series(1,${repository.INCIDENT_GROUP_LIMIT}) n`);
    await repository.recordIncident(
      sanitizeIncident({
        code: 'DB_WRITE_FAILED',
        route: '/settings',
        method: 'PUT',
        statusCode: 500,
      }),
    );
    const count = await database.db.execute(sql`SELECT count(*)::int AS total FROM incidents`);
    expect(count.rows[0]?.['total']).toBe(repository.INCIDENT_GROUP_LIMIT);
    const expired = sanitizeIncident({
      code: 'QUOTA_RELEASE_FAILED',
      route: '/settings',
      method: 'POST',
      statusCode: 500,
    });
    await repository.recordIncident(expired);
    await database.db.execute(
      sql`UPDATE incidents SET last_seen_at=now()-interval '31 days',status='resolved',occurrence_count=3 WHERE fingerprint=${expired.fingerprint}`,
    );
    expect(
      (await repository.listAdminIncidents({ page: 1, q: 'QUOTA_RELEASE_FAILED' })).total,
    ).toBe(0);
    await repository.recordIncident(expired);
    expect(
      (await repository.listAdminIncidents({ page: 1, q: 'QUOTA_RELEASE_FAILED' })).items[0],
    ).toMatchObject({ occurrenceCount: 1, status: 'new' });
    expect((await repository.listAdminIncidents({ page: 1, q: '%' })).total).toBe(0);
  });
});
