import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';

/** Minimal erasure marker; no user ID, email, provider subject or notes are retained. */
export const accountRevocations = pgTable(
  'account_revocations',
  {
    subjectHash: text('subject_hash').primaryKey(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('account_revocations_expires_idx').on(table.expiresAt)],
);
