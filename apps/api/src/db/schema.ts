import { pgTable, text, timestamp, jsonb, uuid, integer } from 'drizzle-orm/pg-core';
import type { Workout, TrainingProgram } from '@sportcoach/shared';

// Table des utilisateurs — Auth.js compatible
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Comptes OAuth liés (Auth.js)
export const accounts = pgTable('accounts', {
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
});

// Sessions Auth.js
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: text('session_token').notNull().unique(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
});

// Table principale des entraînements
// OWASP A01: userId lie chaque workout à son propriétaire
export const workouts = pgTable('workouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  // OWASP A01 — contrôle d'accès: chaque workout appartient à un utilisateur
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  sport: text('sport').notNull(),
  difficulty: text('difficulty', {
    enum: ['beginner', 'intermediate', 'advanced'],
  }).notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  // Données complètes stockées en JSONB pour flexibilité
  data: jsonb('data').notNull().$type<Workout>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Table des programmes multi-semaines
// OWASP A01: userId lie chaque programme à son propriétaire
export const trainingPrograms = pgTable('training_programs', {
  id: uuid('id').primaryKey().defaultRandom(),
  // OWASP A01 — contrôle d'accès: chaque programme appartient à un utilisateur
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
  // Programme complet stocké en JSONB — même pattern que workouts.data
  data: jsonb('data').notNull().$type<TrainingProgram>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Paramètres IA par utilisateur (clé API chiffrée AES-256-GCM, provider, modèle)
// OWASP A02: clé API chiffrée côté serveur avant stockage
export const userSettings = pgTable('user_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  aiProvider: text('ai_provider', { enum: ['mistral', 'openai', 'anthropic'] })
    .notNull()
    .default('mistral'),
  // Clé chiffrée AES-256-GCM : format "iv:authTag:ciphertext" en hex
  aiApiKeyEncrypted: text('ai_api_key_encrypted'),
  aiModel: text('ai_model'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type WorkoutRow = typeof workouts.$inferSelect;
export type NewWorkoutRow = typeof workouts.$inferInsert;
export type TrainingProgramRow = typeof trainingPrograms.$inferSelect;
export type NewTrainingProgramRow = typeof trainingPrograms.$inferInsert;
