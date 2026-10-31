import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './schema.js';

/** Financial and admission records intentionally have no user/operation cascade. */
export const pilotControl = pgTable(
  'pilot_control',
  {
    id: text('id').primaryKey(),
    enabled: boolean('enabled').notNull(),
    activatedAt: timestamp('activated_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    capNanoUsd: bigint('cap_nano_usd', { mode: 'number' }).notNull(),
    legacyNanoUsd: bigint('legacy_nano_usd', { mode: 'number' }).notNull(),
    reviewReference: text('review_reference').notNull(),
    reviewer: text('reviewer').notNull(),
  },
  (t) => [
    check(
      'pilot_control_constants',
      sql`${t.id} = 'global' and ${t.capNanoUsd} = 20000000000 and ${t.endsAt} = ${t.activatedAt} + interval '720 hours' and ${t.legacyNanoUsd} >= 0 and ${t.legacyNanoUsd} <= ${t.capNanoUsd}`,
    ),
  ],
);

export const pilotInvitations = pgTable(
  'pilot_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('pilot_invitations_user_uidx').on(t.userId)],
);

export const pilotAdmissions = pgTable('pilot_admissions', {
  operationId: uuid('operation_id').primaryKey(),
  invitationId: uuid('invitation_id')
    .notNull()
    .references(() => pilotInvitations.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pilotAttempts = pgTable(
  'pilot_attempts',
  {
    receiptId: uuid('receipt_id').primaryKey(),
    operationId: uuid('operation_id')
      .notNull()
      .references(() => pilotAdmissions.operationId),
    model: text('model').notNull(),
    usageModel: text('usage_model'),
    inputNanoUsdPerToken: integer('input_nano_usd_per_token').notNull(),
    outputNanoUsdPerToken: integer('output_nano_usd_per_token').notNull(),
    inputTokensUpperBound: integer('input_tokens_upper_bound').notNull(),
    outputTokensUpperBound: integer('output_tokens_upper_bound').notNull(),
    reservedNanoUsd: bigint('reserved_nano_usd', { mode: 'number' }).notNull(),
    state: text('state', { enum: ['pending', 'unknown', 'settled'] })
      .notNull()
      .default('pending'),
    actualNanoUsd: bigint('actual_nano_usd', { mode: 'number' }),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    providerRequestHash: text('provider_request_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    settledAt: timestamp('settled_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('pilot_attempts_provider_receipt_uidx').on(t.providerRequestHash),
    check(
      'pilot_attempts_amounts',
      sql`${t.reservedNanoUsd} >= 0 and (${t.actualNanoUsd} is null or ${t.actualNanoUsd} >= 0) and ${t.inputNanoUsdPerToken} >= 825 and ${t.outputNanoUsdPerToken} >= 4950`,
    ),
  ],
);
