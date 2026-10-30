import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  uniqueIndex,
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  integer,
} from 'drizzle-orm/pg-core';
import type { Workout, TrainingProgram } from '@alcide/shared';

// Table des utilisateurs â€” Auth.js compatible
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name'),
    email: text('email').notNull(),
    emailVerified: timestamp('email_verified', { withTimezone: true }),
    image: text('image'),
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('users_email_idx').on(table.email)],
);

// Comptes OAuth liÃ©s (Auth.js)
export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    expiresAt: integer('expires_at'),
    tokenType: text('token_type'),
    scope: text('scope'),
    idToken: text('id_token'),
    sessionState: text('session_state'),
  },
  (table) => [
    uniqueIndex('accounts_provider_subject_unique').on(table.provider, table.providerAccountId),
  ],
);

// Sessions Auth.js
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: text('session_token').notNull().unique(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
});

// Table principale des entraÃ®nements
// OWASP A01: userId lie chaque workout Ã  son propriÃ©taire
// Compteur persistant des generations soumises a quota.
// Une seule ligne par utilisateur permet une reservation atomique avant l'appel IA.
export const generationQuotas = pgTable(
  'generation_quotas',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    usedCount: integer('used_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check('generation_quotas_used_count_nonnegative', sql`${table.usedCount} >= 0`)],
);

export const workouts = pgTable(
  'workouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // OWASP A01 â€” contrÃ´le d'accÃ¨s: chaque workout appartient Ã  un utilisateur
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    sport: text('sport').notNull(),
    difficulty: text('difficulty', {
      enum: ['beginner', 'intermediate', 'advanced'],
    }).notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    // DonnÃ©es complÃ¨tes stockÃ©es en JSONB pour flexibilitÃ©
    data: jsonb('data').notNull().$type<Workout>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('workouts_user_created_idx').on(table.userId, table.createdAt),
    index('workouts_user_created_id_idx').on(table.userId, table.createdAt, table.id),
    check(
      'workouts_difficulty_valid',
      sql`${table.difficulty} in ('beginner','intermediate','advanced')`,
    ),
    check(
      'workouts_duration_positive',
      sql`${table.durationMinutes} > 0 and ${table.durationMinutes} <= 180`,
    ),
    check(
      'workouts_data_object',
      sql`jsonb_typeof(${table.data}) = 'object' and ${table.data} ? 'exercises'`,
    ),
  ],
);

// Table des programmes multi-semaines
// OWASP A01: userId lie chaque programme Ã  son propriÃ©taire
export const trainingPrograms = pgTable(
  'training_programs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // OWASP A01 â€” contrÃ´le d'accÃ¨s: chaque programme appartient Ã  un utilisateur
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    sport: text('sport').notNull(),
    difficulty: text('difficulty', {
      enum: ['beginner', 'intermediate', 'advanced'],
    }).notNull(),
    weeksCount: integer('weeks_count').notNull(),
    sessionsPerWeek: integer('sessions_per_week').notNull(),
    sessionDurationMinutes: integer('session_duration_minutes').notNull(),
    // Programme complet stockÃ© en JSONB â€” mÃªme pattern que workouts.data
    data: jsonb('data').notNull().$type<TrainingProgram>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('training_programs_user_created_idx').on(table.userId, table.createdAt),
    index('training_programs_user_created_id_idx').on(table.userId, table.createdAt, table.id),
    check(
      'training_programs_difficulty_valid',
      sql`${table.difficulty} in ('beginner','intermediate','advanced')`,
    ),
    check(
      'training_programs_counts_valid',
      sql`${table.weeksCount} between 2 and 4 and ${table.sessionsPerWeek} between 2 and 5`,
    ),
    check(
      'training_programs_duration_valid',
      sql`${table.sessionDurationMinutes} between 20 and 60`,
    ),
    check(
      'training_programs_data_object',
      sql`jsonb_typeof(${table.data}) = 'object' and ${table.data} ? 'weeks'`,
    ),
  ],
);

// Journal d'execution des seances terminees
// OWASP A01: userId lie chaque log a son proprietaire
export const sessionLogs = pgTable(
  'session_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sourceType: text('source_type', {
      enum: ['workout', 'program_session'],
    }).notNull(),
    workoutId: uuid('workout_id').references(() => workouts.id, { onDelete: 'set null' }),
    programId: uuid('program_id').references(() => trainingPrograms.id, { onDelete: 'set null' }),
    programWeekNumber: integer('program_week_number'),
    programSessionNumber: integer('program_session_number'),
    title: text('title').notNull(),
    sport: text('sport').notNull(),
    difficulty: text('difficulty', {
      enum: ['beginner', 'intermediate', 'advanced'],
    }).notNull(),
    plannedDurationMinutes: integer('planned_duration_minutes').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),
    durationSeconds: integer('duration_seconds').notNull(),
    perceivedEffort: integer('perceived_effort').notNull(),
    feedback: text('feedback', {
      enum: ['too_easy', 'good', 'too_hard'],
    }).notNull(),
    painNotes: text('pain_notes'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('session_logs_user_completed_idx').on(table.userId, table.completedAt),
    index('session_logs_user_completed_id_idx').on(table.userId, table.completedAt, table.id),
    index('session_logs_workout_idx').on(table.workoutId),
    index('session_logs_program_idx').on(table.programId),
    check(
      'session_logs_difficulty_valid',
      sql`${table.difficulty} in ('beginner','intermediate','advanced')`,
    ),
    check('session_logs_feedback_valid', sql`${table.feedback} in ('too_easy','good','too_hard')`),
    check('session_logs_source_valid', sql`${table.sourceType} in ('workout','program_session')`),
    check('session_logs_effort_valid', sql`${table.perceivedEffort} between 1 and 10`),
    check(
      'session_logs_duration_valid',
      sql`${table.durationSeconds} >= 0 and ${table.plannedDurationMinutes} > 0`,
    ),
  ],
);

// ParamÃ¨tres IA par utilisateur (clÃ© API chiffrÃ©e AES-256-GCM, provider, modÃ¨le)
// OWASP A02: clÃ© API chiffrÃ©e cÃ´tÃ© serveur avant stockage
export const userSettings = pgTable('user_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  aiProvider: text('ai_provider', { enum: ['openai'] })
    .notNull()
    .default('openai'),
  // ClÃ© chiffrÃ©e AES-256-GCM : format "iv:authTag:ciphertext" en hex
  aiApiKeyEncrypted: text('ai_api_key_encrypted'),
  aiModel: text('ai_model'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type GenerationQuotaRow = typeof generationQuotas.$inferSelect;
export type WorkoutRow = typeof workouts.$inferSelect;
export type NewWorkoutRow = typeof workouts.$inferInsert;
export type TrainingProgramRow = typeof trainingPrograms.$inferSelect;
export type NewTrainingProgramRow = typeof trainingPrograms.$inferInsert;
export type SessionLogRow = typeof sessionLogs.$inferSelect;
export type NewSessionLogRow = typeof sessionLogs.$inferInsert;

export const billingAccounts = pgTable('billing_accounts', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  stripeCustomerId: text('stripe_customer_id').unique(),
  checkoutSessionId: text('checkout_session_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const billingSubscriptions = pgTable(
  'billing_subscriptions',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => billingAccounts.userId, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('billing_subscriptions_user_idx').on(table.userId)],
);

export const billingCreditGrants = pgTable(
  'billing_credit_grants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => billingAccounts.userId, { onDelete: 'cascade' }),
    sourceKey: text('source_key').notNull().unique(),
    subscriptionId: text('subscription_id').references(() => billingSubscriptions.id),
    amount: integer('amount').notNull(),
    remaining: integer('remaining').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => [
    index('billing_credit_grants_user_idx').on(table.userId),
    check('billing_credit_grants_amount_check', sql`${table.amount}>0`),
    check(
      'billing_credit_grants_remaining_check',
      sql`${table.remaining}>=0 AND ${table.remaining}<=${table.amount}`,
    ),
    check(
      'billing_credit_grants_check',
      sql`${table.expiresAt} IS NULL OR ${table.expiresAt}>${table.startsAt}`,
    ),
  ],
);

export const billingCreditReservations = pgTable(
  'billing_credit_reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => billingAccounts.userId, { onDelete: 'cascade' }),
    allocations: jsonb('allocations').notNull().$type<Array<{ id: string; amount: number }>>(),
    state: text('state').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('billing_reservations_user_idx').on(table.userId, table.state),
    check(
      'billing_credit_reservations_state_check',
      sql`${table.state} IN ('pending','committed','released')`,
    ),
  ],
);

export const billingWebhookEvents = pgTable('billing_webhook_events', {
  id: text('id').primaryKey(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
});

// Comptes OAuth liés (Auth.js)

export const betaTesters = pgTable(
  'beta_testers',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    passwordHash: text('password_hash').notNull(),
    generationBalance: integer('generation_balance').notNull().default(0),
    active: integer('active').notNull().default(1),
    mustChangePassword: integer('must_change_password').notNull().default(1),
    sessionVersion: text('session_version').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('beta_testers_generation_balance_nonnegative', sql`${table.generationBalance} >= 0`),
    check('beta_testers_active_boolean', sql`${table.active} IN (0, 1)`),
    check('beta_testers_must_change_password_boolean', sql`${table.mustChangePassword} IN (0, 1)`),
  ],
);

// Journal minimal des crédits : l'interface peut expliquer chaque variation
// sans stocker ni exposer de donnée de mot de passe.

export const betaCreditAdjustments = pgTable(
  'beta_credit_adjustments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    betaUserId: uuid('beta_user_id')
      .notNull()
      .references(() => betaTesters.userId, { onDelete: 'cascade' }),
    adminEmail: text('admin_email').notNull(),
    amount: integer('amount').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('beta_credit_adjustments_beta_created_idx').on(table.betaUserId, table.createdAt),
  ],
);

export const pageVisits = pgTable(
  'page_visits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('page_visits_occurred_idx').on(table.occurredAt)],
);

// Paramètres IA par utilisateur (clé API chiffrée AES-256-GCM, provider, modèle)
// OWASP A02: clé API chiffrée côté serveur avant stockage

export const platformSettings = pgTable(
  'platform_settings',
  {
    id: text('id').primaryKey().default('default'),
    defaultAiModel: text('default_ai_model').notNull().default('gpt-5.4-mini'),
    defaultBetaGenerationBalance: integer('default_beta_generation_balance').notNull().default(10),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('platform_settings_singleton', sql`${table.id} = 'default'`),
    check(
      'platform_settings_default_beta_generation_balance_range',
      sql`${table.defaultBetaGenerationBalance} BETWEEN 1 AND 10000`,
    ),
  ],
);

export type PlatformSettings = typeof platformSettings.$inferSelect;

export type BetaTesterRow = typeof betaTesters.$inferSelect;

export type BetaCreditAdjustmentRow = typeof betaCreditAdjustments.$inferSelect;

export type PageVisitRow = typeof pageVisits.$inferSelect;

export const adminAuditEvents = pgTable(
  'admin_audit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorEmail: text('actor_email').notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    targetEmail: text('target_email'),
    action: text('action').notNull(),
    reason: text('reason').notNull(),
    changes: jsonb('changes').notNull().default({}).$type<Record<string, unknown>>(),
    requestKey: text('request_key').unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('admin_audit_created_idx').on(table.createdAt, table.id),
    index('admin_audit_user_created_idx').on(table.userId, table.createdAt),
  ],
);

export const adminTracking = pgTable(
  'admin_tracking',
  {
    id: text('id').primaryKey().default('default'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check('admin_tracking_id_check', sql`${table.id} = 'default'`)],
);
