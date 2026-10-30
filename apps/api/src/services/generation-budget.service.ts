import type { CreditPersistence } from '../repositories/billing.repository.js';
import { createHash, randomUUID } from 'node:crypto';
import { generationBudgetRepository } from '../repositories/generation-budget.repository.js';
import type { GenerationKind } from '../repositories/generation-budget.repository.js';
import type { AiExecutionOptions } from './ai.service.js';
import { generationPolicy } from './generation-policy.js';
import { AppError } from '../types/app-error.js';

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  }
  return value;
}

export function generationKey(value?: string): string {
  if (value === undefined) return randomUUID();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw AppError.badRequest('La cle de generation doit etre un UUID valide');
  }
  return value.toLowerCase();
}

export async function executeBudgetedGeneration<Content, Record>(options: {
  userId: string;
  kind: GenerationKind;
  input: unknown;
  operationId?: string;
  signal?: AbortSignal;
  maxAttempts: number;
  generate: (execution: AiExecutionOptions) => Promise<Content>;
  replay: (resourceId: string) => Promise<Record>;
  complete: (operationId: string, content: Content, persist?: CreditPersistence) => Promise<Record>;
  withEntitlement?: (work: (persist?: CreditPersistence) => Promise<Record>) => Promise<Record>;
}): Promise<Record> {
  if (
    !Number.isSafeInteger(options.maxAttempts) ||
    options.maxAttempts < 1 ||
    options.maxAttempts > 8
  ) {
    throw AppError.badRequest('Nombre de tentatives de generation invalide');
  }
  const policy = generationPolicy();
  const inputHash = createHash('sha256')
    .update(JSON.stringify(canonical({ kind: options.kind, input: options.input })))
    .digest('hex');
  let admitted;
  try {
    admitted = await generationBudgetRepository.begin(
      options.userId,
      generationKey(options.operationId),
      options.kind,
      inputHash,
      policy,
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.serviceUnavailable(
      'La reservation de generation est indisponible. Aucun appel IA ne peut etre lance.',
    );
  }
  if (admitted.replay) return options.replay(admitted.operation.resourceId);
  const operationId = admitted.operation.id;
  try {
    const execution: AiExecutionOptions = {
      ...(options.signal ? { signal: options.signal } : {}),
      onAttempt: async (attempt) => {
        // Refresh the kill switch before every fetch, including retries and parallel weeks.
        const current = generationPolicy();
        await generationBudgetRepository.reserveAttempt(
          operationId,
          options.userId,
          attempt,
          options.maxAttempts,
          current,
        );
      },
      onUsage: async (usage) => {
        await generationBudgetRepository.recordUsage(operationId, options.userId, usage, policy);
      },
    };
    const work = async (persist?: CreditPersistence) => {
      const content = await options.generate(execution);
      return options.complete(operationId, content, persist);
    };
    return await (options.withEntitlement ? options.withEntitlement(work) : work());
  } catch (error) {
    try {
      await generationBudgetRepository.fail(operationId, options.userId);
    } catch {
      // Keep the reservation and lease after uncertain failures; never open a second attempt.
      console.error('[GenerationBudget]', { code: 'OPERATION_FINALIZATION_FAILED' });
    }
    throw error;
  }
}
