import { sql, type SQL } from 'drizzle-orm';
import { ADMIN_PAGE_SIZE } from '@alcide/shared';
import type {
  AdminQuery,
  AdminPage,
  AdminMember,
  AdminMemberDetail,
  AdminSubscription,
  AdminCreditEntry,
  AdminAuditEntry,
  AdminAuditPage,
  AdminContent,
  AdminContentDetail,
  AdminActivity,
  AdminSummary,
} from '@alcide/shared';
import { db } from '../db/index.js';
import { AppError } from '../types/app-error.js';
import { isAdministratorEmail } from '../config/admin.js';
import { writeAdminAudit } from './admin-audit.repository.js';
import { getAdminPlatformStats } from './admin-dashboard.repository.js';

async function rows<T>(query: SQL): Promise<T[]> {
  return (await db.execute(query)).rows as T[];
}
function like(value: string) {
  return `%${value.replace(/[\\%_]/g, '\\$&')}%`;
}
function conditions(parts: SQL[]): SQL {
  return parts.length ? sql.join(parts, sql` AND `) : sql`true`;
}
function dateConditions(query: AdminQuery, field: SQL): SQL[] {
  return [
    ...(query.from ? [sql`${field} >= ${query.from}::date`] : []),
    ...(query.to ? [sql`${field} < (${query.to}::date + interval '1 day')`] : []),
  ];
}
async function page<T>(
  base: SQL,
  where: SQL,
  query: AdminQuery,
  order: SQL,
): Promise<AdminPage<T>> {
  const [items, totals] = await Promise.all([
    rows<T>(
      sql`SELECT * FROM (${base}) r WHERE ${where} ORDER BY ${order} LIMIT ${ADMIN_PAGE_SIZE} OFFSET ${(query.page - 1) * ADMIN_PAGE_SIZE}`,
    ),
    rows<{ total: number }>(sql`SELECT count(*)::integer AS total FROM (${base}) r WHERE ${where}`),
  ]);
  return { items, total: totals[0]?.total ?? 0, page: query.page, pageSize: ADMIN_PAGE_SIZE };
}

// These projections are intentionally read-only. readBillingStatus initializes welcome credits.
const memberBase = sql`SELECT u.id,u.name,u.email,u.created_at AS "createdAt",u.suspended_at AS "suspendedAt",
  ba.stripe_customer_id AS "stripeCustomerId",
  CASE WHEN b.user_id IS NULL THEN NULL ELSE jsonb_build_object('active',b.active=1,'remaining',b.generation_balance,'mustChangePassword',b.must_change_password=1) END AS beta,
  CASE WHEN s.id IS NULL THEN NULL ELSE jsonb_build_object('id',s.id,'status',s.status,'periodEnd',s.period_end,'cancelAtPeriodEnd',s.cancel_at_period_end) END AS subscription,
  jsonb_build_object('welcome',coalesce(g.welcome,0),'premium',coalesce(g.premium,0),'offered',coalesce(g.offered,0)) AS credits,
  coalesce(w.total,0)::integer AS "workoutCount",coalesce(p.total,0)::integer AS "programCount",coalesce(l.total,0)::integer AS "completedCount",
  greatest(w.latest,p.latest,l.latest) AS "lastActivityAt"
  FROM users u LEFT JOIN beta_testers b ON b.user_id=u.id LEFT JOIN billing_accounts ba ON ba.user_id=u.id
  LEFT JOIN LATERAL (SELECT * FROM billing_subscriptions WHERE user_id=u.id ORDER BY
    CASE WHEN status IN ('active','past_due','incomplete','trialing','unpaid','paused') THEN 0 ELSE 1 END,updated_at DESC,id LIMIT 1) s ON true
  LEFT JOIN LATERAL (SELECT
    sum(c.remaining) FILTER (WHERE c.subscription_id IS NULL AND c.source_key NOT LIKE 'admin:%')::integer AS welcome,
    sum(c.remaining) FILTER (WHERE c.subscription_id IS NOT NULL)::integer AS premium,
    sum(c.remaining) FILTER (WHERE c.subscription_id IS NULL AND c.source_key LIKE 'admin:%')::integer AS offered
    FROM billing_credit_grants c LEFT JOIN billing_subscriptions sub ON sub.id=c.subscription_id
    WHERE c.user_id=u.id AND c.starts_at<=now() AND (c.expires_at IS NULL OR c.expires_at>now())
      AND (c.subscription_id IS NULL OR sub.status IN ('active','past_due'))) g ON true
  LEFT JOIN LATERAL (SELECT count(*) AS total,max(created_at) AS latest FROM workouts WHERE user_id=u.id) w ON true
  LEFT JOIN LATERAL (SELECT count(*) AS total,max(created_at) AS latest FROM training_programs WHERE user_id=u.id) p ON true
  LEFT JOIN LATERAL (SELECT count(*) AS total,max(completed_at) AS latest FROM session_logs WHERE user_id=u.id) l ON true`;

export async function listAdminMembers(query: AdminQuery): Promise<AdminPage<AdminMember>> {
  const filters: SQL[] = [];
  if (query.q) filters.push(sql`(r.name ILIKE ${like(query.q)} OR r.email ILIKE ${like(query.q)})`);
  if (query.userId) filters.push(sql`r.id=${query.userId}::uuid`);
  if (query.suspended)
    filters.push(
      query.suspended === 'yes' ? sql`r."suspendedAt" IS NOT NULL` : sql`r."suspendedAt" IS NULL`,
    );
  if (query.beta === 'none') filters.push(sql`r.beta IS NULL`);
  if (query.beta === 'present') filters.push(sql`r.beta IS NOT NULL`);
  if (query.beta === 'active') filters.push(sql`r.beta->>'active'='true'`);
  if (query.beta === 'inactive') filters.push(sql`r.beta->>'active'='false'`);
  if (query.beta === 'empty')
    filters.push(sql`r.beta->>'remaining'='0' AND r.beta->>'active'='true'`);
  if (query.beta === 'pending') filters.push(sql`r.beta->>'mustChangePassword'='true'`);
  if (query.subscription === 'none') filters.push(sql`r.subscription IS NULL`);
  else if (query.subscription === 'attention')
    filters.push(sql`r.subscription->>'status' IN ('past_due','unpaid','incomplete')`);
  else if (query.subscription) filters.push(sql`r.subscription->>'status'=${query.subscription}`);
  const result = await page<AdminMember>(
    memberBase,
    conditions(filters),
    query,
    sql`r."createdAt" DESC,r.id`,
  );
  return {
    ...result,
    items: result.items.map((member) => ({
      ...member,
      isAdmin: isAdministratorEmail(member.email),
    })),
  };
}

const activityFields = sql`id,title,sport,completed_at AS "completedAt",duration_seconds AS "durationSeconds"`;
export async function getAdminMember(id: string): Promise<AdminMemberDetail> {
  const result = await listAdminMembers({ page: 1, userId: id });
  const member = result.items[0];
  if (!member) throw AppError.notFound('Membre');
  const recentActivity = await rows<AdminActivity>(
    sql`SELECT ${activityFields} FROM session_logs WHERE user_id=${id}::uuid ORDER BY completed_at DESC,id LIMIT 10`,
  );
  return { member, recentActivity };
}

export async function listAdminSubscriptions(
  query: AdminQuery,
): Promise<AdminPage<AdminSubscription>> {
  const base = sql`SELECT s.id,s.user_id AS "userId",u.name,u.email,s.status,s.period_end AS "periodEnd",s.cancel_at_period_end AS "cancelAtPeriodEnd",b.stripe_customer_id AS "stripeCustomerId",s.updated_at AS "updatedAt"
    FROM billing_subscriptions s JOIN users u ON u.id=s.user_id JOIN billing_accounts b ON b.user_id=s.user_id`;
  const filters = dateConditions(query, sql`r."periodEnd"`);
  if (query.q)
    filters.push(
      sql`(r.name ILIKE ${like(query.q)} OR r.email ILIKE ${like(query.q)} OR r.id ILIKE ${like(query.q)})`,
    );
  if (query.userId) filters.push(sql`r."userId"=${query.userId}::uuid`);
  if (query.subscription === 'attention')
    filters.push(sql`r.status IN ('past_due','unpaid','incomplete')`);
  else if (query.subscription) filters.push(sql`r.status=${query.subscription}`);
  return page(base, conditions(filters), query, sql`r."updatedAt" DESC,r.id`);
}

export async function listAdminCredits(query: AdminQuery): Promise<AdminPage<AdminCreditEntry>> {
  const base = sql`SELECT g.id,g.user_id AS "userId",u.email,
    CASE WHEN g.subscription_id IS NOT NULL THEN 'premium' WHEN g.source_key LIKE 'admin:%' THEN 'offered' ELSE 'welcome' END AS kind,
    g.amount,g.remaining,NULL::integer AS "balanceAfter",g.starts_at AS "createdAt",g.expires_at AS "expiresAt",a.reason
    FROM billing_credit_grants g JOIN users u ON u.id=g.user_id LEFT JOIN admin_audit_events a ON a.request_key=g.source_key
    UNION ALL
    SELECT a.id,a.user_id,coalesce(a.target_email,u.email),'beta',(a.changes->>'amount')::integer,NULL::integer,
      (a.changes->>'balanceAfter')::integer,a.created_at,NULL::timestamptz,a.reason
    FROM admin_audit_events a LEFT JOIN users u ON u.id=a.user_id WHERE a.action IN ('beta.created','beta.credits')`;
  const filters = dateConditions(query, sql`r."createdAt"`);
  if (query.userId) filters.push(sql`r."userId"=${query.userId}::uuid`);
  if (query.q) filters.push(sql`r.email ILIKE ${like(query.q)}`);
  return page(base, conditions(filters), query, sql`r."createdAt" DESC,r.id`);
}

export async function listAdminAudit(query: AdminQuery): Promise<AdminAuditPage> {
  const base = sql`SELECT id,actor_email AS "actorEmail",user_id AS "userId",target_email AS "targetEmail",action,reason,changes,created_at AS "createdAt" FROM admin_audit_events`;
  const filters = dateConditions(query, sql`r."createdAt"`);
  if (query.userId) filters.push(sql`r."userId"=${query.userId}::uuid`);
  if (query.actor) filters.push(sql`r."actorEmail" ILIKE ${like(query.actor)}`);
  if (query.action) filters.push(sql`r.action=${query.action}`);
  if (query.q)
    filters.push(sql`(r."targetEmail" ILIKE ${like(query.q)} OR r.reason ILIKE ${like(query.q)})`);
  const [result, tracking] = await Promise.all([
    page<AdminAuditEntry>(base, conditions(filters), query, sql`r."createdAt" DESC,r.id`),
    rows<{ startedAt: string }>(
      sql`SELECT started_at AS "startedAt" FROM admin_tracking WHERE id='default'`,
    ),
  ]);
  return { ...result, trackingSince: tracking[0]!.startedAt };
}

function contentBase(kind: 'workouts' | 'programs', includeData = false): SQL {
  const table = kind === 'workouts' ? sql`workouts` : sql`training_programs`;
  const duration = kind === 'workouts' ? sql`c.duration_minutes` : sql`c.session_duration_minutes`;
  const weeks = kind === 'workouts' ? sql`NULL::integer` : sql`c.weeks_count`;
  const related = kind === 'workouts' ? sql`l.workout_id=c.id` : sql`l.program_id=c.id`;
  return sql`SELECT c.id,c.user_id AS "userId",u.name,u.email,c.title,c.sport,c.difficulty,c.created_at AS "createdAt",
    ${duration} AS "durationMinutes",${weeks} AS "weeksCount",
    (SELECT count(*)::integer FROM session_logs l WHERE ${related}) AS "completedCount" ${includeData ? sql`,c.data` : sql``}
    FROM ${table} c JOIN users u ON u.id=c.user_id`;
}
export async function listAdminContents(
  kind: 'workouts' | 'programs',
  query: AdminQuery,
): Promise<AdminPage<AdminContent>> {
  const filters = dateConditions(query, sql`r."createdAt"`);
  if (query.q)
    filters.push(
      sql`(r.title ILIKE ${like(query.q)} OR r.email ILIKE ${like(query.q)} OR r.name ILIKE ${like(query.q)})`,
    );
  if (query.userId) filters.push(sql`r."userId"=${query.userId}::uuid`);
  if (query.sport) filters.push(sql`r.sport ILIKE ${like(query.sport)}`);
  if (query.level) filters.push(sql`r.difficulty=${query.level}`);
  return page(contentBase(kind), conditions(filters), query, sql`r."createdAt" DESC,r.id`);
}
export async function getAdminContent(
  kind: 'workouts' | 'programs',
  id: string,
): Promise<AdminContentDetail> {
  const [row] = await rows<AdminContent & Pick<AdminContentDetail, 'data'>>(
    sql`SELECT * FROM (${contentBase(kind, true)}) r WHERE r.id=${id}::uuid`,
  );
  if (!row) throw AppError.notFound(kind === 'workouts' ? 'Séance' : 'Programme');
  const { data, ...content } = row;
  const related = kind === 'workouts' ? sql`workout_id=${id}::uuid` : sql`program_id=${id}::uuid`;
  const recentActivity = await rows<AdminActivity>(
    sql`SELECT ${activityFields} FROM session_logs WHERE ${related} ORDER BY completed_at DESC,id LIMIT 10`,
  );
  return { content, data, recentActivity };
}
export async function getAdminSummary(): Promise<AdminSummary> {
  const [stats, extra] = await Promise.all([
    getAdminPlatformStats(),
    rows<{
      activeSubscriptions: number;
      exhaustedBetaCount: number;
      attentionSubscriptions: number;
    }>(sql`SELECT
      (SELECT count(*)::integer FROM billing_subscriptions WHERE status='active') AS "activeSubscriptions",
      (SELECT count(*)::integer FROM beta_testers WHERE active=1 AND generation_balance=0) AS "exhaustedBetaCount",
      (SELECT count(*)::integer FROM billing_subscriptions WHERE status IN ('past_due','unpaid','incomplete')) AS "attentionSubscriptions"`),
  ]);
  return { ...stats, ...extra[0]! };
}

export async function suspendAdminMember(
  userId: string,
  suspended: boolean,
  reason: string,
  actorEmail: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const result = await tx.execute(
      sql`SELECT email,suspended_at FROM users WHERE id=${userId}::uuid FOR UPDATE`,
    );
    const user = result.rows[0];
    if (!user) throw AppError.notFound('Membre');
    if (isAdministratorEmail(String(user['email'])))
      throw AppError.forbidden('Un compte administrateur ne peut pas être suspendu.');
    const before = user['suspended_at'] !== null;
    if (before === suspended) return;
    await tx.execute(
      sql`UPDATE users SET suspended_at=${suspended ? sql`now()` : sql`NULL`},updated_at=now() WHERE id=${userId}::uuid`,
    );
    await writeAdminAudit(tx, {
      actorEmail,
      userId,
      targetEmail: String(user['email']),
      action: suspended ? 'member.suspended' : 'member.reactivated',
      reason,
      changes: { before, after: suspended },
    });
  });
}

export async function grantAdminCredits(
  userId: string,
  input: { amount: number; reason: string; requestId: string },
  actorEmail: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const member = await tx.execute(
      sql`SELECT email FROM users WHERE id=${userId}::uuid FOR UPDATE`,
    );
    if (!member.rows[0]) throw AppError.notFound('Membre');
    const key = `admin:${userId}:${input.requestId}`;
    const previous = await tx.execute(
      sql`SELECT actor_email,reason,changes FROM admin_audit_events WHERE request_key=${key}`,
    );
    if (previous.rows[0]) {
      const old = previous.rows[0];
      if (
        old['actor_email'] !== actorEmail ||
        old['reason'] !== input.reason ||
        (old['changes'] as { amount: number }).amount !== input.amount
      )
        throw new AppError(
          409,
          'IDEMPOTENCY_CONFLICT',
          'Cette demande a déjà été utilisée avec des valeurs différentes.',
        );
      return;
    }
    // A gift initializes only the billing account, never the welcome grant.
    await tx.execute(
      sql`INSERT INTO billing_accounts(user_id) VALUES (${userId}::uuid) ON CONFLICT DO NOTHING`,
    );
    await tx.execute(
      sql`SELECT user_id FROM billing_accounts WHERE user_id=${userId}::uuid FOR UPDATE`,
    );
    await tx.execute(sql`INSERT INTO billing_credit_grants(user_id,source_key,amount,remaining)
      VALUES (${userId}::uuid,${key},${input.amount},${input.amount})`);
    await writeAdminAudit(tx, {
      actorEmail,
      userId,
      targetEmail: String(member.rows[0]['email']),
      action: 'credits.granted',
      reason: input.reason,
      changes: { amount: input.amount },
      requestKey: key,
    });
  });
}
