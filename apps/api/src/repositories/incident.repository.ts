import { sql, type SQL } from 'drizzle-orm';
import {
  ADMIN_PAGE_SIZE,
  type AdminIncident,
  type AdminIncidentQuery,
  type AdminPage,
  type IncidentStatus,
} from '@alcide/shared';
import { db } from '../db/index.js';
import type { IncidentInput } from '../services/incident.service.js';
import { AppError } from '../types/app-error.js';
import { writeAdminAudit } from './admin-audit.repository.js';

export const INCIDENT_GROUP_LIMIT = 2000;
const projection = sql`id,fingerprint,source,severity,code,route,method,status_code AS "statusCode",
  last_request_id AS "lastRequestId",occurrence_count AS "occurrenceCount",
  first_seen_at AS "firstSeenAt",last_seen_at AS "lastSeenAt",status`;
let nextPurgeAt = 0;
export async function recordIncident(input: IncidentInput): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL statement_timeout = '1500ms'`);
    await tx.execute(sql`SET LOCAL lock_timeout = '500ms'`);
    // Serializes insert/cap enforcement across processes, not just the local collector.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(20261031, 43171)`);
    const now = Date.now();
    if (now >= nextPurgeAt) {
      await tx.execute(sql`DELETE FROM incidents WHERE last_seen_at < now() - interval '30 days'`);
      // Advance only after commit: rollback must not postpone the next cleanup.
    }
    const existing = await tx.execute(
      sql`SELECT id FROM incidents WHERE fingerprint=${input.fingerprint}`,
    );
    if (!existing.rows.length) {
      await tx.execute(sql`DELETE FROM incidents WHERE id IN
        (SELECT id FROM incidents ORDER BY last_seen_at DESC,id DESC OFFSET ${INCIDENT_GROUP_LIMIT - 1})`);
    }
    await tx.execute(sql`INSERT INTO incidents (fingerprint,source,severity,code,route,method,status_code,last_request_id)
      VALUES (${input.fingerprint},${input.source},${input.severity},${input.code},${input.route},${input.method},${input.statusCode},${input.lastRequestId}::uuid)
      ON CONFLICT (fingerprint) DO UPDATE SET
        occurrence_count=CASE WHEN incidents.last_seen_at < now()-interval '30 days' THEN 1 ELSE least(incidents.occurrence_count::bigint+1,2147483647)::integer END,
        first_seen_at=CASE WHEN incidents.last_seen_at < now()-interval '30 days' THEN now() ELSE incidents.first_seen_at END,
        last_seen_at=now(),last_request_id=EXCLUDED.last_request_id,severity=EXCLUDED.severity,
        status=CASE WHEN incidents.status='resolved' OR incidents.last_seen_at < now()-interval '30 days' THEN 'new' ELSE incidents.status END`);
  });
  if (Date.now() >= nextPurgeAt) nextPurgeAt = Date.now() + 15 * 60_000;
}

function serialize(row: AdminIncident): AdminIncident {
  return {
    ...row,
    firstSeenAt: new Date(row.firstSeenAt).toISOString(),
    lastSeenAt: new Date(row.lastSeenAt).toISOString(),
  };
}
export async function listAdminIncidents(
  query: AdminIncidentQuery,
): Promise<AdminPage<AdminIncident>> {
  const filters: SQL[] = [sql`last_seen_at >= now()-interval '30 days'`];
  for (const key of ['source', 'severity', 'status'] as const)
    if (query[key]) filters.push(sql`${sql.identifier(key)}=${query[key]}`);
  // Match the Europe/Paris dates displayed by the administration, including DST.
  if (query.from)
    filters.push(sql`last_seen_at >= (${query.from}::date::timestamp AT TIME ZONE 'Europe/Paris')`);
  if (query.to)
    filters.push(
      sql`last_seen_at < ((${query.to}::date + interval '1 day') AT TIME ZONE 'Europe/Paris')`,
    );
  if (query.q) {
    const pattern = `%${query.q.replace(/[\\%_]/g, '\\$&')}%`;
    filters.push(
      sql`(code ILIKE ${pattern} OR route ILIKE ${pattern} OR last_request_id::text ILIKE ${pattern})`,
    );
  }
  const where = sql.join(filters, sql` AND `);
  const [items, count] = await Promise.all([
    db.execute(
      sql`SELECT ${projection} FROM incidents WHERE ${where} ORDER BY last_seen_at DESC,id DESC LIMIT ${ADMIN_PAGE_SIZE} OFFSET ${(query.page - 1) * ADMIN_PAGE_SIZE}`,
    ),
    db.execute(sql`SELECT count(*)::integer AS total FROM incidents WHERE ${where}`),
  ]);
  return {
    items: (items.rows as unknown as AdminIncident[]).map(serialize),
    total: Number(count.rows[0]?.['total'] ?? 0),
    page: query.page,
    pageSize: ADMIN_PAGE_SIZE,
  };
}
export async function updateAdminIncident(
  id: string,
  status: IncidentStatus,
  actorEmail: string,
): Promise<AdminIncident> {
  return db.transaction(async (tx) => {
    const before = await tx.execute(
      sql`SELECT status FROM incidents WHERE id=${id}::uuid AND last_seen_at >= now()-interval '30 days' FOR UPDATE`,
    );
    if (!before.rows.length) throw AppError.notFound('Incident');
    const result = await tx.execute(
      sql`UPDATE incidents SET status=${status} WHERE id=${id}::uuid RETURNING ${projection}`,
    );
    await writeAdminAudit(tx, {
      actorEmail,
      action: 'incident.status_changed',
      reason: 'Mise à jour du suivi technique',
      changes: { incidentId: id, before: before.rows[0]?.['status'], after: status },
    });
    return serialize(result.rows[0] as unknown as AdminIncident);
  });
}
