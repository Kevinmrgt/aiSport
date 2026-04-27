import { WorkoutSchema } from '@sportcoach/shared';
import type { Workout, GenerateWorkoutInput } from '@sportcoach/shared';
import { AppError } from '../types/app-error.js';
import { callAiProvider } from './ai.service.js';
import type { AiConfig } from './ai.service.js';

// Log structuré pour OWASP A09
function logAiCall(data: {
  success: boolean;
  durationMs: number;
  attempt: number;
  provider: string;
  error?: string;
}): void {
  console.info('[AiService]', {
    ...data,
    timestamp: new Date().toISOString(),
  });
}

function buildPrompt(input: GenerateWorkoutInput): string {
  const totalSeconds = input.duration_minutes * 60;
  // Distribution du temps : 10% échauffement, 82% exercices+repos, 8% récupération
  const warmupSeconds = Math.round(totalSeconds * 0.10);
  const cooldownSeconds = Math.round(totalSeconds * 0.08);
  const mainSeconds = totalSeconds - warmupSeconds - cooldownSeconds;
  // 1 exercice toutes les ~4 min (240s), min 3, max 8
  const exerciseCount = Math.max(3, Math.min(8, Math.round(mainSeconds / 240)));
  const perBlockSeconds = Math.round(mainSeconds / exerciseCount);
  const perExerciseSeconds = Math.round(perBlockSeconds * 0.70);
  const perRestSeconds = perBlockSeconds - perExerciseSeconds;

  const constraints = input.constraints
    ? `Contraintes physiques : ${input.constraints}`
    : 'Aucune contrainte particulière.';

  return `Tu es un coach sportif expert. Génère un entraînement personnalisé en JSON strict.

Sport : ${input.sport}
Niveau : ${input.level}
Durée TOTALE : ${input.duration_minutes} minutes (${totalSeconds} secondes)
Objectifs : ${input.goals}
${constraints}

RÈGLE IMPÉRATIVE DE DURÉE — la somme totale DOIT être exactement ${totalSeconds} secondes :
- warmup : ${warmupSeconds} secondes au total (répartis entre plusieurs phases)
- ${exerciseCount} exercices principaux : chaque exercice a duration_seconds ≈ ${perExerciseSeconds}s et rest_seconds ≈ ${perRestSeconds}s
- cooldown : ${cooldownSeconds} secondes au total
- Vérification : ${warmupSeconds} + (${exerciseCount} × ${perBlockSeconds}) + ${cooldownSeconds} = ${totalSeconds} ✓

IMPORTANT : Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après. Respecte EXACTEMENT ce schéma :

{
  "title": "string",
  "sport": "string",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "duration_minutes": ${input.duration_minutes},
  "exercises": [
    {
      "name": "string",
      "description": "string",
      "sets": number (optionnel),
      "reps": number | "string" (optionnel),
      "rest_seconds": number,
      "duration_seconds": number,
      "tips": "string" (optionnel)
    }
  ],
  "warmup": [{ "name": "string", "duration_seconds": number, "description": "string" }],
  "cooldown": [{ "name": "string", "duration_seconds": number, "description": "string" }]
}`;
}

function extractJson(raw: string): string {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch?.[0]) {
    throw new Error('Aucun JSON trouvé dans la réponse IA');
  }
  return jsonMatch[0];
}

export async function generateWorkout(
  input: GenerateWorkoutInput,
  aiConfig: AiConfig,
): Promise<Workout> {
  const startTime = Date.now();
  const prompt = buildPrompt(input);

  // Retry 1 fois max avec rappel explicite du format
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const rawResponse = await callAiProvider(
        aiConfig,
        attempt === 2
          ? `${prompt}\n\nATTENTION: Réponds ABSOLUMENT avec du JSON valide et rien d'autre.`
          : prompt,
      );

      const jsonStr = extractJson(rawResponse);
      const parsed = JSON.parse(jsonStr) as unknown;
      const validated = WorkoutSchema.safeParse(parsed);

      if (validated.success) {
        logAiCall({
          success: true,
          durationMs: Date.now() - startTime,
          attempt,
          provider: aiConfig.provider,
        });
        return validated.data;
      }

      console.warn(`[AiService] Validation Zod échouée (tentative ${attempt})`, {
        errors: validated.error.errors,
      });

      if (attempt === 2) {
        throw new Error(`Schéma invalide après 2 tentatives: ${validated.error.message}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';

      logAiCall({
        success: false,
        durationMs: Date.now() - startTime,
        attempt,
        provider: aiConfig.provider,
        error: message,
      });

      if (attempt === 2) {
        throw AppError.serviceUnavailable(
          "Impossible de générer l'entraînement, veuillez réessayer",
        );
      }
    }
  }

  throw AppError.internal('Erreur inattendue dans generateWorkout');
}
