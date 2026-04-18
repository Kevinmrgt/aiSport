import { ProgramWeekSchema, TrainingProgramSchema } from '@sportcoach/shared';
import type { ProgramWeek, TrainingProgram, GenerateProgramInput } from '@sportcoach/shared';
import { AppError } from '../types/app-error.js';

// OWASP A02: clé API uniquement en variable d'env
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = 'mistral-small-latest';
// Budget temps : 4 semaines × 12s = 48s < 60s (maxDuration Vercel)
const TIMEOUT_MS = 12_000;

// Phases de progression selon la position dans le programme
function getProgressionPhase(weekNumber: number, totalWeeks: number): string {
  if (weekNumber === 1) return 'Adaptation — charges légères, apprentissage des mouvements';
  if (weekNumber === totalWeeks) return 'Pic de forme — maintien de l\'intensité, objectif final';
  if (weekNumber === totalWeeks - 1) return 'Intensification — charges maximales, volume élevé';
  return 'Construction — progression des charges et du volume';
}

// Message système constant (court pour économiser les tokens)
const SYSTEM_MESSAGE =
  'Tu es un coach sportif expert en planification de programmes progressifs. ' +
  'Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après.';

function buildWeekPrompt(
  input: GenerateProgramInput,
  weekNumber: number,
  phaseLabel: string,
): string {
  const constraints = input.constraints
    ? `Contraintes : ${input.constraints}`
    : 'Aucune contrainte.';

  // Prompt compact (~250 tokens) pour maximiser le budget de réponse
  return `Génère les séances de la semaine ${weekNumber} sur ${input.weeks_count} d'un programme de ${input.sport}.

Niveau : ${input.level}
Durée par séance : ${input.session_duration_minutes} minutes
Nombre de séances : ${input.sessions_per_week}
Phase : ${phaseLabel}
Objectifs : ${input.goals}
${constraints}

Réponds UNIQUEMENT avec ce JSON (et rien d'autre) :
{
  "week_number": ${weekNumber},
  "theme": "string (ex: Adaptation, Construction...)",
  "objective": "string (une phrase sur l'objectif de la semaine)",
  "sessions": [
    {
      "session_number": number,
      "title": "string",
      "focus": "string",
      "duration_minutes": ${input.session_duration_minutes},
      "exercises": [{ "name": "string", "description": "string", "sets": number, "reps": "string ou number", "rest_seconds": number, "tips": "string optionnel" }],
      "warmup": [{ "name": "string", "duration_seconds": number, "description": "string" }],
      "cooldown": [{ "name": "string", "duration_seconds": number, "description": "string" }]
    }
  ]
}`;
}

// OWASP A09: log structuré de chaque appel Mistral
function logMistralProgramCall(data: {
  success: boolean;
  weekNumber: number;
  attempt: number;
  durationMs: number;
  error?: string;
}): void {
  console.info('[MistralProgramService]', {
    ...data,
    timestamp: new Date().toISOString(),
  });
}

async function callMistralForWeek(
  input: GenerateProgramInput,
  weekNumber: number,
  attempt: number,
): Promise<ProgramWeek> {
  // OWASP A02: lire la clé à chaque appel (testable + résilience)
  const apiKey = process.env['MISTRAL_API_KEY'];
  if (!apiKey) {
    throw AppError.internal('Clé API Mistral non configurée');
  }

  const phaseLabel = getProgressionPhase(weekNumber, input.weeks_count);
  const prompt = buildWeekPrompt(input, weekNumber, phaseLabel);

  const controller = new AbortController();
  // OWASP A10: timeout strict sur l'appel externe
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // OWASP A02: clé dans les headers, jamais dans le corps
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_MESSAGE },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1800,
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
    if (!content) throw new Error('Réponse Mistral vide');

    // Extraire le JSON de la réponse (au cas où Mistral ajoute du texte)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch?.[0]) throw new Error('Aucun JSON trouvé dans la réponse Mistral');

    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    const validated = ProgramWeekSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(`Schéma semaine invalide: ${validated.error.message}`);
    }

    return validated.data;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Génère une semaine avec 1 retry (même contrat que mistral.service.ts)
async function generateWeekWithRetry(
  input: GenerateProgramInput,
  weekNumber: number,
): Promise<ProgramWeek> {
  const start = Date.now();

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const week = await callMistralForWeek(input, weekNumber, attempt);
      logMistralProgramCall({
        success: true,
        weekNumber,
        attempt,
        durationMs: Date.now() - start,
      });
      return week;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      logMistralProgramCall({
        success: false,
        weekNumber,
        attempt,
        durationMs: Date.now() - start,
        error: message,
      });

      if (attempt === 2) {
        throw AppError.serviceUnavailable(
          "Impossible de générer le programme d'entraînement, veuillez réessayer",
        );
      }
    }
  }

  // Ne devrait jamais arriver
  throw AppError.internal('Erreur inattendue dans generateWeekWithRetry');
}

// Point d'entrée principal — génère toutes les semaines séquentiellement
export async function generateProgram(input: GenerateProgramInput): Promise<TrainingProgram> {
  // OWASP A02: vérifier la clé avant la boucle
  if (!process.env['MISTRAL_API_KEY']) {
    throw AppError.internal('Clé API Mistral non configurée');
  }

  const globalStart = Date.now();
  const weeks: ProgramWeek[] = [];

  // Appels séquentiels (pas parallèle — budget temps Vercel + concurrence Mistral)
  for (let weekNumber = 1; weekNumber <= input.weeks_count; weekNumber++) {
    const week = await generateWeekWithRetry(input, weekNumber);
    weeks.push(week);
  }

  const levelLabel =
    input.level === 'beginner' ? 'Débutant' : input.level === 'intermediate' ? 'Intermédiaire' : 'Avancé';

  const program: TrainingProgram = {
    title: `Programme ${input.sport} — ${input.weeks_count} semaines (${levelLabel})`,
    sport: input.sport,
    difficulty: input.level,
    weeks_count: input.weeks_count,
    sessions_per_week: input.sessions_per_week,
    session_duration_minutes: input.session_duration_minutes,
    progression_summary:
      `Programme progressif de ${input.weeks_count} semaines en ${input.sport} pour un niveau ${levelLabel}. ` +
      `${input.sessions_per_week} séances de ${input.session_duration_minutes} minutes par semaine. ` +
      `Objectifs : ${input.goals}`,
    weeks,
  };

  // Validation finale du programme assemblé
  const validated = TrainingProgramSchema.safeParse(program);
  if (!validated.success) {
    console.error('[MistralProgramService] Validation finale échouée:', validated.error.errors);
    throw AppError.internal('Erreur lors de la validation du programme généré');
  }

  console.info('[MistralProgramService] Programme généré avec succès', {
    weeksCount: input.weeks_count,
    totalDurationMs: Date.now() - globalStart,
    timestamp: new Date().toISOString(),
  });

  return validated.data;
}
