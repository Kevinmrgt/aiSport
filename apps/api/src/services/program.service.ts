import { generateProgram as generateWithMistral } from './mistral-program.service.js';
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
  // 1. Générer le programme via Mistral AI (appels séquentiels par semaine)
  const program = await generateWithMistral(input);

  // 2. Persister en base via le repository
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
  return findProgramById(programId, userId);
}

export async function removeProgram(programId: string, userId: string): Promise<void> {
  // Le repository vérifie l'ownership avant suppression (OWASP A01)
  return deleteProgram(programId, userId);
}
