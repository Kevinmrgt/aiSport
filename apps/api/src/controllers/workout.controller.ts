import type { Context } from 'hono';
import { GenerateWorkoutRequestSchema } from '../schemas/workout.input.schema.js';
import {
  generateAndSaveWorkout,
  getUserWorkouts,
  getWorkoutDetail,
  removeWorkout,
} from '../services/workout.service.js';
import { AppError } from '../types/app-error.js';

// Valide les inputs Zod, appelle le service, formate la réponse HTTP (architecture.md)
// Jamais d'accès BDD ni de logique métier ici

export async function handleGenerateWorkout(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');

  // OWASP A04: validation Zod systématique avant tout traitement
  const body = await ctx.req.json().catch(() => {
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
      data: workout.data,
      createdAt: workout.createdAt.toISOString(),
    },
    201,
  );
}

export async function handleGetWorkouts(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');
  const workouts = await getUserWorkouts(auth.userId);
  return ctx.json(workouts);
}

export async function handleGetWorkout(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');
  const workoutId = ctx.req.param('id');

  if (!workoutId) {
    throw AppError.badRequest("L'ID de l'entraînement est requis");
  }

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
  const workoutId = ctx.req.param('id');

  if (!workoutId) {
    throw AppError.badRequest("L'ID de l'entraînement est requis");
  }

  await removeWorkout(workoutId, auth.userId);
  return ctx.json({ message: 'Entraînement supprimé' });
}
