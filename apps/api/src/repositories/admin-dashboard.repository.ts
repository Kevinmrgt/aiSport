import { count, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { betaTesters, sessionLogs, trainingPrograms, users, workouts } from '../db/schema.js';

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

export interface AdminPlatformAnalytics {
  daily: Array<{
    date: string;
    newUsers: number;
    workouts: number;
    programs: number;
    completedSessions: number;
  }>;
  sportActivity: Array<{
    date: string;
    sport: string;
    workouts: number;
    completedSessions: number;
  }>;
}

interface DailyAnalyticsRow extends Record<string, unknown> {
  date: string;
  newUsers: number;
  workouts: number;
  programs: number;
  completedSessions: number;
}

interface SportActivityRow extends Record<string, unknown> {
  date: string;
  sport: string;
  workouts: number;
  completedSessions: number;
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
    db
      .select({ value: sql<number>`coalesce(sum(${betaTesters.generationBalance}), 0)::integer` })
      .from(betaTesters),
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

export async function getAdminPlatformAnalytics(): Promise<AdminPlatformAnalytics> {
  const [dailyResult, sportActivityResult] = await Promise.all([
    db.execute<DailyAnalyticsRow>(sql`
      WITH days AS (
        SELECT day::date AS date
        FROM generate_series(current_date - interval '89 days', current_date, interval '1 day') AS day
      ),
      new_users AS (
        SELECT created_at::date AS date, count(*)::integer AS value
        FROM users
        WHERE created_at >= current_date - interval '89 days'
        GROUP BY created_at::date
      ),
      generated_workouts AS (
        SELECT created_at::date AS date, count(*)::integer AS value
        FROM workouts
        WHERE created_at >= current_date - interval '89 days'
        GROUP BY created_at::date
      ),
      generated_programs AS (
        SELECT created_at::date AS date, count(*)::integer AS value
        FROM training_programs
        WHERE created_at >= current_date - interval '89 days'
        GROUP BY created_at::date
      ),
      completed_sessions AS (
        SELECT completed_at::date AS date, count(*)::integer AS value
        FROM session_logs
        WHERE completed_at >= current_date - interval '89 days'
        GROUP BY completed_at::date
      )
      SELECT
        to_char(days.date, 'YYYY-MM-DD') AS "date",
        coalesce(new_users.value, 0)::integer AS "newUsers",
        coalesce(generated_workouts.value, 0)::integer AS "workouts",
        coalesce(generated_programs.value, 0)::integer AS "programs",
        coalesce(completed_sessions.value, 0)::integer AS "completedSessions"
      FROM days
      LEFT JOIN new_users USING (date)
      LEFT JOIN generated_workouts USING (date)
      LEFT JOIN generated_programs USING (date)
      LEFT JOIN completed_sessions USING (date)
      ORDER BY days.date
    `),
    db.execute<SportActivityRow>(sql`
      SELECT
        to_char(activity.date, 'YYYY-MM-DD') AS "date",
        activity.sport AS "sport",
        sum(activity.workouts)::integer AS "workouts",
        sum(activity.completed_sessions)::integer AS "completedSessions"
      FROM (
        SELECT
          created_at::date AS date,
          sport,
          count(*)::integer AS workouts,
          0::integer AS completed_sessions
        FROM workouts
        WHERE created_at >= current_date - interval '89 days'
        GROUP BY created_at::date, sport
        UNION ALL
        SELECT
          completed_at::date AS date,
          sport,
          0::integer AS workouts,
          count(*)::integer AS completed_sessions
        FROM session_logs
        WHERE completed_at >= current_date - interval '89 days'
        GROUP BY completed_at::date, sport
      ) AS activity
      GROUP BY activity.date, activity.sport
      ORDER BY activity.date, activity.sport
    `),
  ]);

  return {
    daily: dailyResult.rows.map((row) => ({
      date: row.date,
      newUsers: Number(row.newUsers),
      workouts: Number(row.workouts),
      programs: Number(row.programs),
      completedSessions: Number(row.completedSessions),
    })),
    sportActivity: sportActivityResult.rows.map((row) => ({
      date: row.date,
      sport: row.sport,
      workouts: Number(row.workouts),
      completedSessions: Number(row.completedSessions),
    })),
  };
}
