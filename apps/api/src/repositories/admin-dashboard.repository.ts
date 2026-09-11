import { count, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  betaTesters,
  sessionLogs,
  trainingPrograms,
  users,
  workouts,
} from '../db/schema.js';

export interface AdminPlatformStats {
  totalUsers: number;
  betaTesterCount: number;
  activeBetaTesterCount: number;
  pendingPasswordChangeCount: number;
  availableGenerations: number;
  workoutCount: number;
  programCount: number;
  completedSessionCount: number;
  newUsersLast30Days: number;
}

export async function getAdminPlatformStats(): Promise<AdminPlatformStats> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    [usersCount],
    [betaCount],
    [activeBetaCount],
    [pendingPasswordChanges],
    [generationTotal],
    [workoutCount],
    [programCount],
    [sessionCount],
    [recentUsersCount],
  ] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(betaTesters),
    db.select({ value: count() }).from(betaTesters).where(eq(betaTesters.active, 1)),
    db.select({ value: count() }).from(betaTesters).where(eq(betaTesters.mustChangePassword, 1)),
    db.select({ value: sql<number>`coalesce(sum(${betaTesters.generationBalance}), 0)::integer` }).from(betaTesters),
    db.select({ value: count() }).from(workouts),
    db.select({ value: count() }).from(trainingPrograms),
    db.select({ value: count() }).from(sessionLogs),
    db.select({ value: count() }).from(users).where(gte(users.createdAt, thirtyDaysAgo)),
  ]);

  return {
    totalUsers: usersCount?.value ?? 0,
    betaTesterCount: betaCount?.value ?? 0,
    activeBetaTesterCount: activeBetaCount?.value ?? 0,
    pendingPasswordChangeCount: pendingPasswordChanges?.value ?? 0,
    availableGenerations: generationTotal?.value ?? 0,
    workoutCount: workoutCount?.value ?? 0,
    programCount: programCount?.value ?? 0,
    completedSessionCount: sessionCount?.value ?? 0,
    newUsersLast30Days: recentUsersCount?.value ?? 0,
  };
}
