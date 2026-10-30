import { runWithGenerationQuota, type GenerationAccessMode } from './generation-quota.service.js';
import { generateProgram } from './program-ai.service.js';
import { resolveAiConfig } from '../controllers/settings.controller.js';
import {
  findProgramsByUser,
  findProgramById,
  deleteProgram,
} from '../repositories/program.repository.js';
import type {
  GenerateProgramInput,
  TrainingProgramRecord,
  ProgramListResponse,
} from '@alcide/shared';
import { executeBudgetedGeneration } from './generation-budget.service.js';
import { generationBudgetRepository } from '../repositories/generation-budget.repository.js';

// Logique metier : ne connait pas HTTP ni Drizzle.
export async function generateAndSaveProgram(
  userId: string,
  input: GenerateProgramInput,
  operationId?: string,
  signal?: AbortSignal,
  accessMode: GenerationAccessMode = 'standard',
): Promise<TrainingProgramRecord> {
  return executeBudgetedGeneration({
    userId,
    kind: 'program',
    input,
    maxAttempts: input.weeks_count * 2,
    ...(operationId !== undefined ? { operationId } : {}),
    ...(signal ? { signal } : {}),
    generate: async (execution) => generateProgram(input, await resolveAiConfig(userId), execution),
    replay: (resourceId) => findProgramById(resourceId, userId),
    withEntitlement: (work) => runWithGenerationQuota(userId, accessMode, work, input.weeks_count),
    complete: (id, program, persist) =>
      persist
        ? persist((tx) => generationBudgetRepository.completeProgram(id, userId, program, tx))
        : generationBudgetRepository.completeProgram(id, userId, program),
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
  // Historical content is validated by the repository, never rewritten on read.
  return findProgramById(programId, userId);
}

export async function removeProgram(programId: string, userId: string): Promise<void> {
  return deleteProgram(programId, userId);
}
