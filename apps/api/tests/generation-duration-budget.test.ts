import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkoutSchema, TrainingProgramSchema, getSessionTiming } from '@alcide/shared';
import { generateWorkout } from '../src/services/workout-ai.service.js';
import { generateProgram } from '../src/services/program-ai.service.js';
import { AppError } from '../src/types/app-error.js';
import { getAiInputTokensUpperBound } from '../src/services/ai.service.js';
import {
  correctionFeedback,
  DraftWorkoutSchema,
  planSession,
} from '../src/services/session-planner.service.js';

const fetchMock = vi.fn();
const ai = { provider: 'openai' as const, apiKey: 'synthetic-local-no-network' };
const session = (minutes: number, workSeconds: number[], number = 1) => ({
  session_number: number,
  title: 'Composition synthétique',
  focus: 'Endurance',
  duration_minutes: minutes,
  exercises: workSeconds.map((work_seconds, index) => ({
    name: `Marche ${index}`,
    description: 'Allure confortable',
    tips: null,
    prescription: {
      version: 2,
      category: 'cardio',
      mode: 'continuous',
      sets: 1,
      reps: null,
      work_seconds,
      rest_seconds: 0,
      transition_seconds: 0,
      circuit_id: null,
    },
  })),
  warmup: [{ name: 'Préparation', description: 'Progressivement', duration_seconds: 180 }],
  cooldown: [{ name: 'Retour', description: 'Progressivement', duration_seconds: 120 }],
});
const response = (content: unknown) =>
  Response.json({
    model: 'gpt-5.4-mini-2026-03-17',
    choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(content) } }],
    usage: { prompt_tokens: 200, completion_tokens: 100, total_tokens: 300 },
  });
interface Body {
  messages: Array<{ role: string; content: string }>;
  response_format: {
    json_schema: { name: string; schema: { properties: { week_number: { enum: number[] } } } };
  };
}

const strengthSession = (minutes: number, warmupSeconds: number, number = 1) => ({
  ...session(minutes, [], number),
  exercises: Array.from({ length: 7 }, (_, index) => ({
    name: `Squat ${index}`,
    description: 'a'.repeat(288),
    tips: null,
    prescription: {
      version: 2,
      category: 'strength',
      mode: 'repetitions',
      sets: 3,
      reps: 10,
      work_seconds: 30,
      rest_seconds: 90,
      transition_seconds: 30,
      circuit_id: null,
    },
  })),
  warmup: [
    { name: 'Préparation', duration_seconds: warmupSeconds, description: 'Progressivement' },
  ],
});

describe('regeneration of an infeasible composition within the unchanged input budget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('fits the exact seven-strength-movement reviewer counterexample through real admission without truncating user input', async () => {
    const draft = strengthSession(15, 30);
    const invalid = {
      title: 'Séance synthétique',
      sport: 'marche',
      difficulty: 'beginner',
      duration_minutes: draft.duration_minutes,
      exercises: draft.exercises,
      warmup: draft.warmup,
      cooldown: draft.cooldown,
    };
    expect(new TextEncoder().encode(JSON.stringify(invalid)).byteLength).toBe(3819);
    const corrected = { ...invalid, warmup: strengthSession(15, 180).warmup };
    fetchMock.mockResolvedValueOnce(response(invalid)).mockResolvedValueOnce(response(corrected));
    const bounds: number[] = [];
    const goals = 'Entretenir une endurance générale à allure confortable.';
    const result = await generateWorkout(
      { sport: 'marche', level: 'beginner', duration_minutes: 15, goals },
      ai,
      {
        onUsage: vi.fn(),
        onAttempt: (attempt) => {
          bounds.push(attempt.inputTokensUpperBound);
          if (attempt.inputTokensUpperBound > 16384)
            throw AppError.serviceUnavailable('Synthetic input policy refused');
        },
      },
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(bounds).toEqual([12068, 12228]);
    expect(WorkoutSchema.safeParse(result).success).toBe(true);
    expect(result.exercises).toHaveLength(7);
    const requests = fetchMock.mock.calls.map(
      (call) => JSON.parse((call[1] as RequestInit).body as string) as Body,
    );
    for (const request of requests) expect(request.messages[1]!.content).toContain(goals);
    expect(requests[1]!.messages[1]!.content).toContain('échauffement');
    expect(requests[1]!.messages[1]!.content).not.toContain(JSON.stringify(invalid));
    let planningError: unknown;
    try {
      planSession(DraftWorkoutSchema.parse(invalid), 'beginner');
    } catch (error) {
      planningError = error;
    }
    expect(planningError).toBeDefined();
    const unboundedFeedback = correctionFeedback(planningError, JSON.stringify(invalid));
    expect(
      getAiInputTokensUpperBound(requests[0]!.messages[1]!.content + unboundedFeedback, {
        jsonSchema: {
          name: requests[0]!.response_format.json_schema.name,
          schema: requests[0]!.response_format.json_schema.schema,
        },
      }),
    ).toBe(16391);
  });

  it.each([2, 5])(
    'bounds ordinary correction feedback for %i programme sessions and preserves full user goals and constraints',
    async (sessionsPerWeek) => {
      const counts = new Map<number, number>();
      fetchMock.mockImplementation((_url: string, init: RequestInit) => {
        const request = JSON.parse(init.body as string) as Body;
        const week = request.response_format.json_schema.schema.properties.week_number.enum[0]!;
        const count = (counts.get(week) ?? 0) + 1;
        counts.set(week, count);
        return Promise.resolve(
          response({
            week_number: week,
            theme: 'Progression',
            objective: 'Régularité',
            sessions: Array.from({ length: sessionsPerWeek }, (_, index) =>
              strengthSession(20, count === 1 ? 30 : 180, index + 1),
            ),
          }),
        );
      });
      const bounds: number[] = [];
      const goals = 'Renforcement général et contrôle 😀';
      const constraints = 'Tapis et haltères légers ; éviter les sauts.';
      const result = await generateProgram(
        {
          sport: 'musculation',
          level: 'beginner',
          weeks_count: 2,
          sessions_per_week: sessionsPerWeek,
          session_duration_minutes: 20,
          goals,
          constraints,
        },
        ai,
        {
          onUsage: vi.fn(),
          onAttempt: (attempt) => {
            bounds.push(attempt.inputTokensUpperBound);
            if (attempt.inputTokensUpperBound > 16384)
              throw AppError.serviceUnavailable('Synthetic input policy refused');
          },
        },
      );
      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(bounds.every((bound) => bound <= 16384)).toBe(true);
      expect([...counts.values()]).toEqual([2, 2]);
      expect(TrainingProgramSchema.safeParse(result).success).toBe(true);
      let compactRetries = 0;
      for (const call of fetchMock.mock.calls) {
        const request = JSON.parse((call[1] as RequestInit).body as string) as Body;
        expect(request.messages[1]!.content).toContain(goals);
        expect(request.messages[1]!.content).toContain(constraints);
        if (request.messages[1]!.content.includes('Diagnostics :')) {
          compactRetries++;
          for (let number = 1; number <= sessionsPerWeek; number++) {
            expect(request.messages[1]!.content).toContain(`Séance ${number}`);
          }
          expect(request.messages[1]!.content).not.toContain('<proposition>');
        }
      }
      expect(compactRetries).toBe(2);
    },
  );

  it.each([
    [1380, 1380, 1380],
    [1080, 1140, 1140],
  ])(
    'recomposes a candidate profile %j instead of discarding movements locally',
    async (...workSeconds) => {
      const invalid = {
        ...session(15, workSeconds),
        title: 'Composition synthétique',
        sport: 'marche',
        difficulty: 'beginner',
      };
      const corrected = {
        ...session(15, [300, 300]),
        title: 'Nouvelle proposition',
        sport: 'marche',
        difficulty: 'beginner',
      };
      fetchMock.mockResolvedValueOnce(response(invalid)).mockResolvedValueOnce(response(corrected));
      const bounds: number[] = [],
        usages = vi.fn();
      const result = await generateWorkout(
        {
          sport: 'marche',
          level: 'beginner',
          duration_minutes: 15,
          goals: 'Entretenir une endurance générale à allure confortable.',
        },
        ai,
        {
          onAttempt: (attempt) => {
            bounds.push(attempt.inputTokensUpperBound);
            if (attempt.inputTokensUpperBound > 16384)
              throw AppError.serviceUnavailable('Synthetic input policy refused');
          },
          onUsage: usages,
        },
      );
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(usages).toHaveBeenCalledTimes(2);
      expect(bounds.every((bound) => bound <= 16384)).toBe(true);
      expect(WorkoutSchema.safeParse(result).success).toBe(true);
      expect(result.title).toBe('Nouvelle proposition');
      expect(result.exercises).toHaveLength(2);
      expect(
        getSessionTiming(result.exercises, result.warmup, result.cooldown).plannedSeconds,
      ).toBe(900);
      const retry = JSON.parse((fetchMock.mock.calls[1]![1] as RequestInit).body as string) as Body;
      expect(retry.messages[1]!.content).toContain('1200s');
      expect(retry.messages[1]!.content).toContain('990s');
      expect(retry.messages[1]!.content).not.toContain(JSON.stringify(invalid));
    },
  );

  it.each([2, 5])(
    'regenerates both weeks of %i sessions without exceeding 16384 UTF-8 input bytes per attempt',
    async (sessionsPerWeek) => {
      const counts = new Map<number, number>();
      fetchMock.mockImplementation((_url: string, init: RequestInit) => {
        const request = JSON.parse(init.body as string) as Body;
        const week = request.response_format.json_schema.schema.properties.week_number.enum[0]!;
        const count = (counts.get(week) ?? 0) + 1;
        counts.set(week, count);
        return Promise.resolve(
          response({
            week_number: week,
            theme: 'Progression',
            objective: 'Régularité',
            sessions: Array.from({ length: sessionsPerWeek }, (_, index) =>
              session(20, count === 1 ? [600, 600, 600, 600] : [900], index + 1),
            ),
          }),
        );
      });
      const bounds: number[] = [],
        usages = vi.fn();
      const result = await generateProgram(
        {
          sport: 'marche',
          level: 'beginner',
          weeks_count: 2,
          sessions_per_week: sessionsPerWeek,
          session_duration_minutes: 20,
          goals: 'Entretenir une endurance générale avec une progression douce.',
        },
        ai,
        {
          onAttempt: (attempt) => {
            bounds.push(attempt.inputTokensUpperBound);
            if (attempt.inputTokensUpperBound > 16384)
              throw AppError.serviceUnavailable('Synthetic input policy refused');
          },
          onUsage: usages,
        },
      );
      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(usages).toHaveBeenCalledTimes(4);
      expect(bounds.every((bound) => bound <= 16384)).toBe(true);
      expect([...counts.values()]).toEqual([2, 2]);
      expect(TrainingProgramSchema.safeParse(result).success).toBe(true);
    },
  );
});
