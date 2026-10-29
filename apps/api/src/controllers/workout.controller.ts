import type { Context } from 'hono';
import { z } from 'zod';
import { GenerateWorkoutRequestSchema } from '../schemas/workout.input.schema.js';
import {
  generateAndSaveWorkout,
  getUserWorkouts,
  getWorkoutDetail,
  removeWorkout,
  getUserStats,
} from '../services/workout.service.js';
import { AppError } from '../types/app-error.js';

const WorkoutQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(9),
  sport: z.string().trim().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});
const WorkoutIdSchema = z.string().uuid();

function parseWorkoutId(value: string | undefined): string {
  const parsed = WorkoutIdSchema.safeParse(value);
  if (!parsed.success) {
    throw AppError.badRequest("L'ID de l'entrainement doit etre un UUID valide");
  }
  return parsed.data;
}

// Valide les inputs Zod, appelle le service, formate la réponse HTTP (architecture.md)
// Jamais d'accès BDD ni de logique métier ici

export async function handleGenerateWorkout(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');

  // OWASP A04: validation Zod systématique avant tout traitement
  const body: unknown = await ctx.req.json<unknown>().catch(() => {
    throw AppError.badRequest('Corps de la requête JSON invalide');
  });

  const parsed = GenerateWorkoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw AppError.badRequest('Données invalides', parsed.error.flatten());
  }

  const workout = await generateAndSaveWorkout(auth.userId, {
    sport: parsed.data.sport,
    level: parsed.data.level,
    duration_minutes: parsed.data.duration_minutes,
    goals: parsed.data.goals,
    constraints: parsed.data.constraints,
  });

  return ctx.json(
    {
      id: workout.id,
      title: workout.title,
      sport: workout.sport,
      difficulty: workout.difficulty,
      durationMinutes: workout.durationMinutes,
      exercises: workout.data.exercises,
      warmup: workout.data.warmup,
      cooldown: workout.data.cooldown,
      createdAt: workout.createdAt.toISOString(),
    },
    201,
  );
}

export async function handleGetWorkouts(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');

  // OWASP A04: valider les query params avec Zod
  const parsed = WorkoutQuerySchema.safeParse(ctx.req.query());
  if (!parsed.success) {
    throw AppError.badRequest('Paramètres de requête invalides', parsed.error.flatten());
  }

  // Filtrer les undefined pour satisfaire exactOptionalPropertyTypes
  const opts = {
    page: parsed.data.page,
    limit: parsed.data.limit,
    ...(parsed.data.sport !== undefined && { sport: parsed.data.sport }),
    ...(parsed.data.level !== undefined && { level: parsed.data.level }),
  };
  const result = await getUserWorkouts(auth.userId, opts);
  return ctx.json(result);
}

export async function handleGetStats(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');
  const stats = await getUserStats(auth.userId);
  return ctx.json(stats);
}

export async function handleGetWorkout(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');
  const workoutId = parseWorkoutId(ctx.req.param('id'));

  const workout = await getWorkoutDetail(workoutId, auth.userId);

  return ctx.json({
    id: workout.id,
    title: workout.title,
    sport: workout.sport,
    difficulty: workout.difficulty,
    durationMinutes: workout.durationMinutes,
    exercises: workout.data.exercises,
    warmup: workout.data.warmup,
    cooldown: workout.data.cooldown,
    createdAt: workout.createdAt.toISOString(),
  });
}

export async function handleDeleteWorkout(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');
  const workoutId = parseWorkoutId(ctx.req.param('id'));

  await removeWorkout(workoutId, auth.userId);
  return ctx.json({ message: 'Entraînement supprimé' });
}
