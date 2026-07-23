import type { Context } from 'hono';
import { z } from 'zod';
import { GenerateProgramRequestSchema } from '../schemas/program.input.schema.js';
import {
  generateAndSaveProgram,
  getUserPrograms,
  getProgramDetail,
  removeProgram,
} from '../services/program.service.js';
import { AppError } from '../types/app-error.js';

const ProgramQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(9),
});
const ProgramIdSchema = z.string().uuid();

function parseProgramId(value: string | undefined): string {
  const parsed = ProgramIdSchema.safeParse(value);
  if (!parsed.success) {
    throw AppError.badRequest("L'ID du programme doit etre un UUID valide");
  }
  return parsed.data;
}

// Valide les inputs Zod, appelle le service, formate la réponse HTTP (architecture.md)
// Jamais d'accès BDD ni de logique métier ici

export async function handleGenerateProgram(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');

  // OWASP A04: validation Zod systématique avant tout traitement
  const body: unknown = await ctx.req.json<unknown>().catch(() => {
    throw AppError.badRequest('Corps de la requête JSON invalide');
  });

  const parsed = GenerateProgramRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw AppError.badRequest('Données invalides', parsed.error.flatten());
  }

  const program = await generateAndSaveProgram(
    auth.userId,
    {
      sport: parsed.data.sport,
      level: parsed.data.level,
      weeks_count: parsed.data.weeks_count,
      sessions_per_week: parsed.data.sessions_per_week,
      session_duration_minutes: parsed.data.session_duration_minutes,
      goals: parsed.data.goals,
      constraints: parsed.data.constraints,
    },
    auth.accessMode,
  );

  return ctx.json(
    {
      id: program.id,
      title: program.title,
      sport: program.sport,
      difficulty: program.difficulty,
      weeksCount: program.weeksCount,
      sessionsPerWeek: program.sessionsPerWeek,
      sessionDurationMinutes: program.sessionDurationMinutes,
      createdAt: program.createdAt.toISOString(),
    },
    201,
  );
}

export async function handleGetPrograms(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');

  // OWASP A04: valider les query params avec Zod
  const parsed = ProgramQuerySchema.safeParse(ctx.req.query());
  if (!parsed.success) {
    throw AppError.badRequest('Paramètres de requête invalides', parsed.error.flatten());
  }

  const result = await getUserPrograms(auth.userId, {
    page: parsed.data.page,
    limit: parsed.data.limit,
  });
  return ctx.json(result);
}

export async function handleGetProgram(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');
  const programId = parseProgramId(ctx.req.param('id'));

  const program = await getProgramDetail(programId, auth.userId);

  return ctx.json({
    id: program.id,
    title: program.title,
    sport: program.sport,
    difficulty: program.difficulty,
    weeksCount: program.weeksCount,
    sessionsPerWeek: program.sessionsPerWeek,
    sessionDurationMinutes: program.sessionDurationMinutes,
    data: program.data,
    createdAt: program.createdAt.toISOString(),
  });
}

export async function handleDeleteProgram(ctx: Context): Promise<Response> {
  const auth = ctx.get('auth');
  const programId = parseProgramId(ctx.req.param('id'));

  await removeProgram(programId, auth.userId);
  return ctx.json({ message: 'Programme supprimé' });
}
