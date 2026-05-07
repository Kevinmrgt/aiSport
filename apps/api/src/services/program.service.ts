import { generateProgram } from './mistral-program.service.js';
import { normalizeTrainingProgramDurations } from './program-duration.service.js';
import { resolveAiConfig } from '../controllers/settings.controller.js';
import {
  createProgram,
  findProgramsByUser,
  findProgramById,
  deleteProgram,
} from '../repositories/program.repository.js';
import type { GenerateProgramInput, TrainingProgramRecord, ProgramListResponse } from '@sportcoach/shared';

// Logique métier — ne connaît pas HTTP ni Drizzle (architecture.md)

export async function generateAndSaveProgram(
  userId: string,
  input: GenerateProgramInput,
): Promise<TrainingProgramRecord> {
  // Résoudre la config IA : clé perso de l'utilisateur ou clé serveur Mistral
  const aiConfig = await resolveAiConfig(userId);

  // Générer le programme via le provider IA configuré
  const program = await generateProgram(input, aiConfig);

  // Persister en base via le repository
  return createProgram(userId, program);
}

export async function getUserPrograms(
  userId: string,
  opts: { page?: number; limit?: number } = {},
): Promise<ProgramListResponse> {
  return findProgramsByUser(userId, opts);
}

export async function getProgramDetail(
  programId: string,
  userId: string,
): Promise<TrainingProgramRecord> {
  // Le repository vérifie l'ownership (OWASP A01)
  const program = await findProgramById(programId, userId);
  return {
    ...program,
    data: normalizeTrainingProgramDurations(program.data),
  };
}

export async function removeProgram(programId: string, userId: string): Promise<void> {
  // Le repository vérifie l'ownership avant suppression (OWASP A01)
  return deleteProgram(programId, userId);
}
