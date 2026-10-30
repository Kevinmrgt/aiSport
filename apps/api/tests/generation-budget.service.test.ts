import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../src/types/app-error.js';
import {
  executeBudgetedGeneration,
  generationKey,
} from '../src/services/generation-budget.service.js';
import { generationPolicy } from '../src/services/generation-policy.js';

const repository = vi.hoisted(() => ({
  begin: vi.fn(),
  reserveAttempt: vi.fn(),
  recordUsage: vi.fn(),
  fail: vi.fn(),
}));
vi.mock('../src/repositories/generation-budget.repository.js', () => ({
  generationBudgetRepository: repository,
}));

const operationKey = '99999999-1111-4111-8111-111111111111';
const userId = '11111111-1111-4111-8111-111111111111';
const attempt = { model: 'gpt-5.4-mini', maxCompletionTokens: 2048, inputTokensUpperBound: 500 };

describe('persistent generation orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.begin.mockResolvedValue({
      operation: { id: 'operation', resourceId: 'result' },
      replay: false,
    });
    repository.reserveAttempt.mockResolvedValue(undefined);
    repository.recordUsage.mockResolvedValue(undefined);
    repository.fail.mockResolvedValue(undefined);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('reserves before provider execution and accounts before completion', async () => {
    const events: string[] = [];
    repository.reserveAttempt.mockImplementation(() => {
      events.push('reserved');
      return Promise.resolve();
    });
    repository.recordUsage.mockImplementation(() => {
      events.push('accounted');
      return Promise.resolve();
    });
    const complete = vi.fn(() => {
      events.push('committed');
      return Promise.resolve({ id: 'saved' });
    });
    const result = await executeBudgetedGeneration({
      userId,
      operationId: operationKey,
      kind: 'workout',
      input: { goals: 'sport' },
      maxAttempts: 2,
      generate: async (execution) => {
        await execution.onAttempt?.(attempt);
        events.push('provider');
        await execution.onUsage?.({
          model: attempt.model,
          inputTokens: 50,
          outputTokens: 100,
          totalTokens: 150,
        });
        return { title: 'result' };
      },
      replay: vi.fn(),
      complete,
    });
    expect(result).toEqual({ id: 'saved' });
    expect(events).toEqual(['reserved', 'provider', 'accounted', 'committed']);
    expect(repository.recordUsage.mock.calls[0]?.[4]).toBeUndefined();
  });

  it('returns a completed resource without calling the provider or reserving again', async () => {
    repository.begin.mockResolvedValue({
      operation: { id: 'operation', resourceId: 'result' },
      replay: true,
    });
    const generate = vi.fn();
    const replay = vi.fn().mockResolvedValue({ id: 'result' });
    await expect(
      executeBudgetedGeneration({
        userId,
        operationId: operationKey,
        kind: 'workout',
        input: {},
        maxAttempts: 2,
        generate,
        replay,
        complete: vi.fn(),
      }),
    ).resolves.toEqual({ id: 'result' });
    expect(replay).toHaveBeenCalledWith('result');
    expect(generate).not.toHaveBeenCalled();
    expect(repository.reserveAttempt).not.toHaveBeenCalled();
  });

  it('fails closed before the provider when database admission is unavailable', async () => {
    repository.begin.mockRejectedValue(new Error('private database detail'));
    const generate = vi.fn();
    await expect(
      executeBudgetedGeneration({
        userId,
        kind: 'workout',
        input: {},
        maxAttempts: 2,
        generate,
        replay: vi.fn(),
        complete: vi.fn(),
      }),
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(generate).not.toHaveBeenCalled();
  });

  it('preserves quota errors and never executes the provider after a rejected reservation', async () => {
    repository.reserveAttempt.mockRejectedValue(AppError.tooManyRequests('budget exceeded'));
    const fetchProvider = vi.fn();
    await expect(
      executeBudgetedGeneration({
        userId,
        kind: 'program',
        input: {},
        maxAttempts: 8,
        generate: async (execution) => {
          await execution.onAttempt?.(attempt);
          await fetchProvider();
          return {};
        },
        replay: vi.fn(),
        complete: vi.fn(),
      }),
    ).rejects.toMatchObject({ statusCode: 429 });
    expect(fetchProvider).not.toHaveBeenCalled();
    expect(repository.fail).toHaveBeenCalledWith('operation', userId);
  });

  it('hashes equivalent parameter ordering identically without storing the input', async () => {
    const options = {
      userId,
      kind: 'workout' as const,
      maxAttempts: 2,
      generate: vi.fn().mockResolvedValue({}),
      replay: vi.fn(),
      complete: vi.fn().mockResolvedValue({}),
    };
    await executeBudgetedGeneration({
      ...options,
      input: { sport: 'course', goals: 'private goals' },
    });
    await executeBudgetedGeneration({
      ...options,
      input: { goals: 'private goals', sport: 'course' },
    });
    expect(repository.begin.mock.calls[0]?.[3]).toBe(repository.begin.mock.calls[1]?.[3]);
    expect(JSON.stringify(repository.begin.mock.calls)).not.toContain('private goals');
  });

  it('validates operation IDs, model policy and finite quota configuration', () => {
    expect(generationKey(operationKey)).toBe(operationKey);
    expect(() => generationKey('bad-key')).toThrow(AppError);
    vi.stubEnv('AI_USER_DAILY_TOKENS', 'Infinity');
    expect(() => generationPolicy()).toThrow(AppError);
    vi.stubEnv('AI_USER_DAILY_TOKENS', '100000');
    vi.stubEnv('AI_ALLOWED_MODELS', '');
    expect(() => generationPolicy()).toThrow(AppError);
  });
});

describe('credits and persistent generation replay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.fail.mockResolvedValue(undefined);
  });
  it('replays an existing result without reserving or debiting another credit', async () => {
    repository.begin.mockResolvedValue({
      operation: { id: 'op', resourceId: 'saved' },
      replay: true,
    });
    const withEntitlement = vi.fn(),
      generate = vi.fn(),
      complete = vi.fn(),
      replay = vi.fn().mockResolvedValue({ id: 'saved' });
    await expect(
      executeBudgetedGeneration({
        userId,
        kind: 'workout',
        input: {},
        maxAttempts: 2,
        withEntitlement,
        generate,
        complete,
        replay,
      }),
    ).resolves.toEqual({ id: 'saved' });
    expect(withEntitlement).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });
  it('rejects exhausted credits before any provider call and finalizes the operation', async () => {
    repository.begin.mockResolvedValue({
      operation: { id: 'op', resourceId: 'saved' },
      replay: false,
    });
    const generate = vi.fn(),
      complete = vi.fn();
    await expect(
      executeBudgetedGeneration({
        userId,
        kind: 'program',
        input: {},
        maxAttempts: 4,
        withEntitlement: () =>
          Promise.reject(new AppError(402, 'INSUFFICIENT_CREDITS', 'Solde insuffisant')),
        generate,
        complete,
        replay: vi.fn(),
      }),
    ).rejects.toMatchObject({ statusCode: 402 });
    expect(generate).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
    expect(repository.fail).toHaveBeenCalledWith('op', userId);
  });
});

describe('admission proof for measured settlement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.begin.mockResolvedValue({
      operation: { id: 'operation', resourceId: 'result' },
      replay: false,
    });
    repository.reserveAttempt.mockResolvedValue(undefined);
    repository.recordUsage.mockResolvedValue(undefined);
  });
  const options = {
    userId,
    kind: 'program' as const,
    input: {},
    maxAttempts: 4,
    replay: vi.fn(),
    complete: vi.fn().mockResolvedValue({}),
  };
  it('associates each usage only with its successfully admitted immutable HTTP receipt', async () => {
    const a = { ...attempt, receiptId: '11111111-1111-4111-8111-111111111111' };
    const b = {
      ...attempt,
      receiptId: '22222222-2222-4222-8222-222222222222',
      maxCompletionTokens: 4000,
      inputTokensUpperBound: 1000,
    };
    await executeBudgetedGeneration({
      ...options,
      generate: async (execution) => {
        await Promise.all([execution.onAttempt?.(a), execution.onAttempt?.(b)]);
        const measured = {
          model: 'gpt-5.4-mini-2026-03-17',
          inputTokens: 50,
          outputTokens: 100,
          totalTokens: 150,
        };
        await execution.onUsage?.({ ...measured, receiptId: b.receiptId }, b);
        await execution.onUsage?.({ ...measured, receiptId: a.receiptId }, a);
        await execution.onUsage?.(
          { ...measured, receiptId: a.receiptId },
          { ...a, maxCompletionTokens: 1 },
        );
        return {};
      },
    });
    expect(repository.recordUsage.mock.calls[0]?.[4]).toEqual(b);
    expect(repository.recordUsage.mock.calls[1]?.[4]).toEqual(a);
    expect(repository.recordUsage.mock.calls[2]?.[4]).toBeUndefined();
    expect(Object.isFrozen(repository.recordUsage.mock.calls[0]?.[4])).toBe(true);
  });
  it('does not prove a rejected or duplicate admission', async () => {
    const a = { ...attempt, receiptId: '33333333-3333-4333-8333-333333333333' };
    repository.reserveAttempt.mockRejectedValueOnce(AppError.tooManyRequests('limit'));
    await executeBudgetedGeneration({
      ...options,
      generate: async (execution) => {
        await expect(execution.onAttempt?.(a)).rejects.toMatchObject({ statusCode: 429 });
        await execution.onUsage?.(
          {
            receiptId: a.receiptId,
            model: a.model,
            inputTokens: 1,
            outputTokens: 1,
            totalTokens: 2,
          },
          a,
        );
        await expect(execution.onAttempt?.(a)).rejects.toMatchObject({ statusCode: 503 });
        return {};
      },
    });
    expect(repository.recordUsage.mock.calls[0]?.[4]).toBeUndefined();
    expect(repository.reserveAttempt).toHaveBeenCalledOnce();
  });
});
