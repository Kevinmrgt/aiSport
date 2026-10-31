import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const incidents = pgTable(
  'incidents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fingerprint: text('fingerprint').notNull().unique(),
    source: text('source').notNull(),
    severity: text('severity').notNull(),
    code: text('code').notNull(),
    route: text('route').notNull(),
    method: text('method').notNull(),
    statusCode: integer('status_code'),
    lastRequestId: uuid('last_request_id'),
    occurrenceCount: integer('occurrence_count').notNull().default(1),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    status: text('status').notNull().default('new'),
  },
  (table) => [
    index('incidents_last_seen_idx').on(table.lastSeenAt),
    index('incidents_status_last_seen_idx').on(table.status, table.lastSeenAt),
    check('incidents_source_check', sql`${table.source} IN ('api','ai','web')`),
    check('incidents_severity_check', sql`${table.severity} IN ('warning','error','critical')`),
    check('incidents_status_check', sql`${table.status} IN ('new','in_progress','resolved')`),
    check('incidents_count_check', sql`${table.occurrenceCount} > 0`),
  ],
);
