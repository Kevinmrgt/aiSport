import { z } from 'zod';
import type { Workout } from './types/workout.types.js';
import type { TrainingProgram } from './schemas/program.schema.js';

export const ADMIN_PAGE_SIZE = 25;
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Date invalide');
export const AdminQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    q: z.string().trim().max(150).optional(),
    suspended: z.enum(['yes', 'no']).optional(),
    beta: z.enum(['present', 'active', 'inactive', 'none', 'empty', 'pending']).optional(),
    subscription: z
      .enum([
        'none',
        'attention',
        'active',
        'past_due',
        'canceled',
        'unpaid',
        'trialing',
        'incomplete',
        'incomplete_expired',
        'paused',
      ])
      .optional(),
    userId: z.string().uuid().optional(),
    sport: z.string().trim().max(80).optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    from: date.optional(),
    to: date.optional(),
    actor: z.string().trim().max(254).optional(),
    action: z.string().trim().max(80).optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: 'La date de début doit précéder la date de fin.',
    path: ['to'],
  });
export type AdminQuery = z.infer<typeof AdminQuerySchema>;
export const AdminReasonSchema = z.string().trim().min(3).max(500);
export const AdminSuspensionSchema = z.object({
  suspended: z.boolean(),
  reason: AdminReasonSchema,
});
export const AdminGrantSchema = z.object({
  amount: z.number().int().min(1).max(10000),
  reason: AdminReasonSchema,
  requestId: z.string().uuid(),
});
export const AdminBetaCreateSchema = z.object({
  name: z.string().trim().min(1).max(128),
  email: z.string().trim().email().max(254),
  generationBalance: z.number().int().min(0).max(10000),
});
export const AdminBetaAdjustmentSchema = z.object({
  amount: z
    .number()
    .int()
    .min(-10000)
    .max(10000)
    .refine((value) => value !== 0),
  reason: AdminReasonSchema.optional(),
  requestId: z.string().uuid().optional(),
});
export const AdminBetaStatusSchema = z.object({
  active: z.boolean(),
  reason: AdminReasonSchema.optional(),
});
export const AdminReasonInputSchema = z.object({ reason: AdminReasonSchema.optional() });
export const AdminSettingsSchema = z.object({
  defaultAiModel: z.string().min(1).max(80),
  defaultBetaGenerationBalance: z.number().int().min(1).max(10000),
});
export type AdminSettings = z.infer<typeof AdminSettingsSchema>;
export interface AdminSettingsResponse {
  settings: AdminSettings;
  availableModels: Array<{ id: string; label: string }>;
}
export interface AdminPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface AdminCredits {
  welcome: number;
  premium: number;
  offered: number;
}
export interface AdminMember {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  suspendedAt: string | null;
  isAdmin: boolean;
  stripeCustomerId: string | null;
  beta: { active: boolean; remaining: number; mustChangePassword: boolean } | null;
  subscription: {
    id: string;
    status: string;
    periodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  credits: AdminCredits;
  workoutCount: number;
  programCount: number;
  completedCount: number;
  lastActivityAt: string | null;
}
export interface AdminActivity {
  id: string;
  title: string;
  sport: string;
  completedAt: string;
  durationSeconds: number;
}
export interface AdminMemberDetail {
  member: AdminMember;
  recentActivity: AdminActivity[];
}
export interface AdminSubscription {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  status: string;
  periodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  updatedAt: string;
}
export interface AdminCreditEntry {
  id: string;
  userId: string;
  email: string;
  kind: 'welcome' | 'premium' | 'offered' | 'beta';
  amount: number;
  remaining: number | null;
  balanceAfter: number | null;
  createdAt: string;
  expiresAt: string | null;
  reason: string | null;
}
export interface AdminAuditEntry {
  id: string;
  actorEmail: string;
  userId: string | null;
  targetEmail: string | null;
  action: string;
  reason: string;
  changes: Record<string, unknown>;
  createdAt: string;
}
export interface AdminAuditPage extends AdminPage<AdminAuditEntry> {
  trackingSince: string;
}
export interface AdminContent {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  title: string;
  sport: string;
  difficulty: string;
  createdAt: string;
  durationMinutes: number;
  weeksCount: number | null;
  completedCount: number;
}
export interface AdminContentDetail {
  content: AdminContent;
  data: Workout | TrainingProgram;
  recentActivity: AdminActivity[];
}
export interface AdminSummary {
  totalUsers: number;
  activeBetaTesterCount: number;
  workoutCount: number;
  programCount: number;
  completedSessionCount: number;
  newUsersLast30Days: number;
  activeSubscriptions: number;
  exhaustedBetaCount: number;
  attentionSubscriptions: number;
}
