import { generateProgram } from './program-ai.service.js';
import { normalizeTrainingProgramDurations } from './program-duration.service.js';
import { resolveAiConfig } from '../controllers/settings.controller.js';
import {
  createProgram,
  findProgramsByUser,
  findProgramById,
  deleteProgram,
} from '../repositories/program.repository.js';
import type {
  GenerateProgramInput,
  TrainingProgramRecord,
  ProgramListResponse,
} from '@alcide/shared';
import { runWithGenerationQuota, type GenerationAccessMode } from './generation-quota.service.js';

// Logique metier : ne connait pas HTTP ni Drizzle.
export async function generateAndSaveProgram(
  userId: string,
  input: GenerateProgramInput,
  accessMode: GenerationAccessMode = 'standard',
): Promise<TrainingProgramRecord> {
  return runWithGenerationQuota(userId, accessMode, async () => {
    const aiConfig = await resolveAiConfig(userId);
    const program = await generateProgram(input, aiConfig);
    return createProgram(userId, program);
  });
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
  const program = await findProgramById(programId, userId);
  return {
    ...program,
    data: normalizeTrainingProgramDurations(program.data),
  };
}

export async function removeProgram(programId: string, userId: string): Promise<void> {
  return deleteProgram(programId, userId);
}
