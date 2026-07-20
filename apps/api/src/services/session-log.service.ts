import { findProgramById } from '../repositories/program.repository.js';
import {
  createSessionLog,
  type CreateSessionLogInput,
} from '../repositories/session-log.repository.js';
import { findWorkoutById } from '../repositories/workout.repository.js';
import type { SessionLogRow } from '../db/schema.js';
import { AppError } from '../types/app-error.js';

/**
 * Verifie l'appartenance de la source puis recopie les metadonnees de confiance
 * depuis la base. Le client ne peut ainsi ni journaliser la ressource d'un autre
 * utilisateur, ni falsifier le sport, le niveau ou la duree planifiee.
 */
export async function createOwnedSessionLog(
  userId: string,
  input: CreateSessionLogInput,
): Promise<SessionLogRow> {
  if (input.sourceType === 'workout') {
    if (!input.workoutId) {
      throw AppError.badRequest("L'ID de la seance est requis");
    }

    const workout = await findWorkoutById(input.workoutId, userId);
    return createSessionLog(userId, {
      ...input,
      programId: null,
      programWeekNumber: null,
      programSessionNumber: null,
      title: workout.title,
      sport: workout.sport,
      difficulty: workout.difficulty,
      plannedDurationMinutes: workout.durationMinutes,
    });
  }

  if (!input.programId || !input.programWeekNumber || !input.programSessionNumber) {
    throw AppError.badRequest("L'identification de la seance du programme est incomplete");
  }

  const program = await findProgramById(input.programId, userId);
  const week = program.data.weeks.find(
    (candidate) => candidate.week_number === input.programWeekNumber,
  );
  const session = week?.sessions.find(
    (candidate) => candidate.session_number === input.programSessionNumber,
  );
  if (!session) {
    throw AppError.badRequest("La seance demandee n'existe pas dans ce programme");
  }

  return createSessionLog(userId, {
    ...input,
    workoutId: null,
    title: session.title,
    sport: program.sport,
    difficulty: program.difficulty,
    plannedDurationMinutes: session.duration_minutes,
  });
}
