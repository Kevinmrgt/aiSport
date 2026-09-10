import { WorkoutSchema } from '@alcide/shared';
import type { Workout, GenerateWorkoutInput } from '@alcide/shared';
import { AppError } from '../types/app-error.js';
import { AiTimeoutError, callAiProvider } from './ai.service.js';
import type { AiConfig } from './ai.service.js';
import { workoutOutputSchema } from './training-output-schema.js';
import {
  correctionFeedback,
  generationDiagnostics,
  DraftWorkoutSchema,
  planSession,
  PRESCRIPTION_PROMPT,
} from './session-planner.service.js';

const WORKOUT_AI_TIMEOUT_MS = 45_000;
const WORKOUT_REQUEST_DEADLINE_MS = 55_000;
const WORKOUT_PROVIDER_MARGIN_MS = 5_000;
const WORKOUT_RETRY_MIN_BUDGET_MS = 5_000;

function buildPrompt(input: GenerateWorkoutInput): string {
  return `Tu es Alcide, un coach sportif. Prépare une séance réalisable en JSON uniquement.
Sport : ${input.sport}
Niveau : ${input.level}
Créneau : ${input.duration_minutes} minutes
Objectifs : ${input.goals}
Contraintes et matériel : ${input.constraints ?? 'Aucune contrainte particulière.'}
${PRESCRIPTION_PROMPT}`;
}

export async function generateWorkout(
  input: GenerateWorkoutInput,
  aiConfig: AiConfig,
): Promise<Workout> {
  const startTime = Date.now();
  const deadline = startTime + WORKOUT_REQUEST_DEADLINE_MS;
  const prompt = buildPrompt(input);
  let feedback = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    let previousJson = '';
    const timeoutMs = Math.min(
      WORKOUT_AI_TIMEOUT_MS,
      deadline - Date.now() - WORKOUT_PROVIDER_MARGIN_MS,
    );
    if (timeoutMs < WORKOUT_RETRY_MIN_BUDGET_MS)
      throw AppError.serviceUnavailable(
        'Alcide met trop de temps à générer la séance. Réessayez dans quelques instants.',
      );
    try {
      const raw = await callAiProvider(aiConfig, prompt + feedback, {
        timeoutMs,
        temperature: 0.2,
        maxTokens: 6000,
        jsonSchema: workoutOutputSchema(input),
      });
      const json = raw.match(/\{[\s\S]*\}/)?.[0];
      if (!json) throw new Error('Réponds avec un objet JSON valide et complet.');
      previousJson = json;
      const draft = DraftWorkoutSchema.parse(JSON.parse(json));
      if (
        draft.duration_minutes !== input.duration_minutes ||
        draft.difficulty !== input.level ||
        draft.sport.trim().toLocaleLowerCase('fr') !== input.sport.trim().toLocaleLowerCase('fr')
      ) {
        throw new Error('Conserve exactement le sport, le niveau et le créneau demandés.');
      }
      const workout = WorkoutSchema.parse(planSession(draft, input.level));
      console.info('[AiService]', {
        success: true,
        attempt,
        durationMs: Date.now() - startTime,
        provider: aiConfig.provider,
      });
      return workout;
    } catch (error) {
      console.warn('[AiService]', {
        success: false,
        attempt,
        durationMs: Date.now() - startTime,
        ...generationDiagnostics(error),
      });
      if (error instanceof AiTimeoutError)
        throw AppError.serviceUnavailable(
          'Alcide met trop de temps à répondre, veuillez réessayer dans quelques instants',
        );
      if (error instanceof AppError) throw error;
      feedback = correctionFeedback(error, previousJson);
      if (attempt === 2)
        throw AppError.serviceUnavailable(
          'Alcide n’a pas réussi à finaliser cette séance. Réessayez dans quelques instants avec les mêmes paramètres.',
        );
    }
  }
  throw AppError.internal('Erreur inattendue dans generateWorkout');
}
