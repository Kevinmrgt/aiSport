import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './schema.js';

export const generationControl = pgTable(
  'generation_control',
  {
    id: text('id').primaryKey().default('global'),
    enabled: boolean('enabled').notNull().default(true),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check('generation_control_global_check', sql`${table.id} = 'global'`)],
);

/** No prompts, health notes or generated content are retained in accounting rows. */
export const generationOperations = pgTable(
  'generation_operations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    operationKey: uuid('operation_key').notNull(),
    kind: text('kind', { enum: ['workout', 'program'] }).notNull(),
    inputHash: text('input_hash').notNull(),
    status: text('status', { enum: ['running', 'succeeded', 'failed'] })
      .notNull()
      .default('running'),
    resourceId: uuid('resource_id').notNull(),
    attempts: integer('attempts').notNull().default(0),
    reservedTokens: integer('reserved_tokens').notNull().default(0),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('generation_operations_user_key_uidx').on(table.userId, table.operationKey),
    index('generation_operations_active_idx').on(table.status, table.leaseExpiresAt),
    check('generation_operations_kind_check', sql`${table.kind} in ('workout', 'program')`),
    check(
      'generation_operations_status_check',
      sql`${table.status} in ('running', 'succeeded', 'failed')`,
    ),
    check(
      'generation_operations_counters_check',
      sql`${table.attempts} >= 0 and ${table.reservedTokens} >= 0 and ${table.inputTokens} >= 0 and ${table.outputTokens} >= 0`,
    ),
    check('generation_operations_hash_check', sql`${table.inputHash} ~ '^[a-f0-9]{64}$'`),
  ],
);

export const generationDailyBudgets = pgTable(
  'generation_daily_budgets',
  {
    scope: text('scope').notNull(),
    day: date('day').notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    attempts: integer('attempts').notNull().default(0),
    reservedTokens: integer('reserved_tokens').notNull().default(0),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.scope, table.day] }),
    index('generation_daily_budgets_user_idx').on(table.userId),
    check(
      'generation_daily_budgets_scope_check',
      sql`(${table.scope} = 'global' and ${table.userId} is null) or (${table.userId} is not null and ${table.scope} = 'user:' || ${table.userId}::text)`,
    ),
    check(
      'generation_daily_budgets_counters_check',
      sql`${table.attempts} >= 0 and ${table.reservedTokens} >= 0 and ${table.inputTokens} >= 0 and ${table.outputTokens} >= 0`,
    ),
  ],
);

export const generationUsageEvents = pgTable(
  'generation_usage_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    operationId: uuid('operation_id')
      .notNull()
      .references(() => generationOperations.id, { onDelete: 'cascade' }),
    eventKey: text('event_key').notNull(),
    model: text('model').notNull(),
    inputTokens: integer('input_tokens').notNull(),
    outputTokens: integer('output_tokens').notNull(),
    totalTokens: integer('total_tokens').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('generation_usage_events_operation_key_uidx').on(table.operationId, table.eventKey),
    check(
      'generation_usage_events_tokens_check',
      sql`${table.inputTokens} >= 0 and ${table.outputTokens} >= 0 and ${table.totalTokens} >= ${table.inputTokens} + ${table.outputTokens}`,
    ),
  ],
);

export type GenerationOperation = typeof generationOperations.$inferSelect;
