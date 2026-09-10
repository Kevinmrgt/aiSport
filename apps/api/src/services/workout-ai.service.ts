import { WorkoutSchema } from '@alcide/shared';
import type { Workout, GenerateWorkoutInput } from '@alcide/shared';
import { AppError } from '../types/app-error.js';
import { AiTimeoutError, callAiProvider } from './ai.service.js';
import type { AiConfig } from './ai.service.js';
import { DraftWorkoutSchema, planSession, PRESCRIPTION_PROMPT } from './session-planner.service.js';

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
${PRESCRIPTION_PROMPT}
Format : {"title":"string","sport":"${input.sport}","difficulty":"${input.level}","duration_minutes":${input.duration_minutes},"exercises":[{"name":"string","description":"consigne technique concise","tips":"conseil facultatif","prescription":{...}}],"warmup":[{"name":"string","duration_seconds":180,"description":"string"}],"cooldown":[{"name":"string","duration_seconds":120,"description":"string"}]}
Remplace {...} par une prescription complète. Ne répète pas de champs durée/séries hors prescription.`;
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
      });
      const json = raw.match(/\{[\s\S]*\}/)?.[0];
      if (!json) throw new Error('Réponds avec un objet JSON valide et complet.');
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
        reason: error instanceof Error ? error.name : 'UnknownError',
      });
      if (error instanceof AiTimeoutError)
        throw AppError.serviceUnavailable(
          'Alcide met trop de temps à répondre, veuillez réessayer dans quelques instants',
        );
      if (error instanceof AppError) throw error;
      feedback = `\nCorrige la proposition et renvoie le JSON complet. Problèmes précis : ${String(error instanceof Error ? error.message : error).slice(0, 1600)}`;
      if (attempt === 2)
        throw AppError.serviceUnavailable(
          'Alcide n’a pas pu composer une séance cohérente dans ce créneau. Essayez une autre durée ou précisez vos objectifs.',
        );
    }
  }
  throw AppError.internal('Erreur inattendue dans generateWorkout');
}
