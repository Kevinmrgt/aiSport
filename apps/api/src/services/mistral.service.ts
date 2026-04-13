import { WorkoutSchema } from '@sportcoach/shared';
import type { Workout, GenerateWorkoutInput } from '@sportcoach/shared';
import { AppError } from '../types/app-error.js';

// OWASP A02: clé API uniquement en variable d'env — lue à l'appel, pas au module load
// (permet les mocks en test)
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = 'mistral-small-latest';
// OWASP A10: timeout strict sur les appels externes (mistral-contract.md)
const TIMEOUT_MS = 30_000;

// Log structuré pour OWASP A09
function logMistralCall(data: {
  success: boolean;
  durationMs: number;
  attempt: number;
  error?: string;
}): void {
  console.info('[MistralService]', {
    ...data,
    timestamp: new Date().toISOString(),
  });
}

function buildPrompt(input: GenerateWorkoutInput): string {
  const constraints = input.constraints
    ? `Contraintes physiques : ${input.constraints}`
    : 'Aucune contrainte particulière.';

  // Le prompt demande STRICTEMENT un JSON — contrat Mistral (mistral-contract.md)
  return `Tu es un coach sportif expert. Génère un entraînement personnalisé en JSON strict.

Sport : ${input.sport}
Niveau : ${input.level}
Durée : ${input.duration_minutes} minutes
Objectifs : ${input.goals}
${constraints}

IMPORTANT : Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après. Respecte EXACTEMENT ce schéma :

{
  "title": "string",
  "sport": "string",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "duration_minutes": number,
  "exercises": [
    {
      "name": "string",
      "description": "string",
      "sets": number (optionnel),
      "reps": number | "string" (optionnel),
      "rest_seconds": number,
      "duration_seconds": number (optionnel),
      "tips": "string" (optionnel)
    }
  ],
  "warmup": [{ "name": "string", "duration_seconds": number, "description": "string" }] (optionnel),
  "cooldown": [{ "name": "string", "duration_seconds": number, "description": "string" }] (optionnel)
}`;
}

function extractJson(raw: string): string {
  // Gérer les réponses Mistral avec texte autour du JSON (mistral-contract.md)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch?.[0]) {
    throw new Error('Aucun JSON trouvé dans la réponse Mistral');
  }
  return jsonMatch[0];
}

async function callMistralApi(prompt: string, attempt: number): Promise<string> {
  // OWASP A02: lire la clé à chaque appel (testable + résilience au rechargement d'env)
  const apiKey = process.env['MISTRAL_API_KEY'];
  if (!apiKey) {
    throw AppError.internal('Clé API Mistral non configurée');
  }

  const controller = new AbortController();
  // OWASP A10: timeout sur l'appel externe
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // OWASP A02: clé API uniquement dans les headers, jamais dans le corps
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
        // Forcer la réponse JSON (mistral-contract.md)
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Mistral API erreur: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const content = data.choices[0]?.message.content;

    if (!content) {
      throw new Error('Réponse Mistral vide');
    }

    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateWorkout(input: GenerateWorkoutInput): Promise<Workout> {
  // Vérifier la clé avant la boucle pour un code d'erreur précis (500 vs 503)
  if (!process.env['MISTRAL_API_KEY']) {
    throw AppError.internal('Clé API Mistral non configurée');
  }

  const startTime = Date.now();
  const prompt = buildPrompt(input);

  // Retry 1 fois max avec prompt plus explicite (mistral-contract.md)
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const rawResponse = await callMistralApi(
        attempt === 2
          ? `${prompt}\n\nATTENTION: Réponds ABSOLUMENT avec du JSON valide et rien d'autre.`
          : prompt,
        attempt,
      );

      const jsonStr = extractJson(rawResponse);
      const parsed = JSON.parse(jsonStr) as unknown;
      const validated = WorkoutSchema.safeParse(parsed);

      if (validated.success) {
        logMistralCall({
          success: true,
          durationMs: Date.now() - startTime,
          attempt,
        });
        return validated.data;
      }

      // Validation Zod échouée — retry si premier essai
      console.warn(`[MistralService] Validation Zod échouée (tentative ${attempt})`, {
        errors: validated.error.errors,
      });

      if (attempt === 2) {
        throw new Error(`Schéma invalide après 2 tentatives: ${validated.error.message}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';

      logMistralCall({
        success: false,
        durationMs: Date.now() - startTime,
        attempt,
        error: message,
      });

      if (attempt === 2) {
        // Erreur propre à l'utilisateur (mistral-contract.md)
        throw AppError.serviceUnavailable(
          "Impossible de générer l'entraînement, veuillez réessayer",
        );
      }

      // Attendre avant retry (backoff simple)
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  // Ne devrait jamais arriver, mais TypeScript requiert un return
  throw AppError.internal('Erreur inattendue dans generateWorkout');
}
