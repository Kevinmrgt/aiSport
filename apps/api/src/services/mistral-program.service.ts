import { ProgramWeekSchema, TrainingProgramSchema } from '@sportcoach/shared';
import type { ProgramWeek, TrainingProgram, GenerateProgramInput } from '@sportcoach/shared';
import { AppError } from '../types/app-error.js';
import { AiTimeoutError, callAiProvider } from './ai.service.js';
import type { AiConfig } from './ai.service.js';
import { normalizeTrainingProgramDurations } from './program-duration.service.js';

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

// Chaque semaine est generee en parallele. Le budget global evite les 504 Vercel
// quand une tentative lente revient invalide puis declenche un retry.
const PROGRAM_WEEK_AI_TIMEOUT_MS = 45_000;
const PROGRAM_REQUEST_DEADLINE_MS = 55_000;
const PROGRAM_RETRY_MIN_BUDGET_MS = 30_000;
const PROGRAM_PROVIDER_MARGIN_MS = 5_000;
const PROGRAM_WEEK_MIN_TIMEOUT_MS = 5_000;

function buildWeekPrompt(
  input: GenerateProgramInput,
  weekNumber: number,
  phaseLabel: string,
): string {
  const constraints = input.constraints
    ? `Contraintes : ${input.constraints}`
    : 'Aucune contrainte.';

  // Prompt compact pour limiter les reponses longues qui finissent en JSON invalide.
  return `Génère les séances de la semaine ${weekNumber} sur ${input.weeks_count} d'un programme de ${input.sport}.

Niveau : ${input.level}
Durée par séance : ${input.session_duration_minutes} minutes
Nombre de séances : ${input.sessions_per_week}
Phase : ${phaseLabel}
Objectifs : ${input.goals}
${constraints}

Contraintes de sortie :
- exactement ${input.sessions_per_week} séances
- 2 exercices par séance, pas plus
- chaque exercice a duration_seconds
- total warmup + duration_seconds + rest_seconds + cooldown = ${input.session_duration_minutes * 60} secondes par séance
- descriptions et conseils en moins de 90 caractères
- warmup et cooldown optionnels, maximum 1 élément chacun
- JSON compact, sans markdown

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
      "exercises": [{ "name": "string", "description": "string", "duration_seconds": number, "sets": number, "reps": "string ou number", "rest_seconds": number, "tips": "string optionnel" }],
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

async function callAiForWeek(
  input: GenerateProgramInput,
  weekNumber: number,
  aiConfig: AiConfig,
  timeoutMs: number,
): Promise<ProgramWeek> {
  const phaseLabel = getProgressionPhase(weekNumber, input.weeks_count);
  // Fusionner le message système dans le prompt pour la compatibilité multi-providers
  const prompt = `${SYSTEM_MESSAGE}\n\n${buildWeekPrompt(input, weekNumber, phaseLabel)}`;

  const content = await callAiProvider(aiConfig, prompt, {
    timeoutMs,
    temperature: 0.2,
  });

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch?.[0]) throw new Error('Aucun JSON trouvé dans la réponse IA');

  const parsed = JSON.parse(jsonMatch[0]) as unknown;
  const validated = ProgramWeekSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(`Schéma semaine invalide: ${validated.error.message}`);
  }

  return validated.data;
}

async function generateWeekWithRetry(
  input: GenerateProgramInput,
  weekNumber: number,
  aiConfig: AiConfig,
  requestDeadline: number,
): Promise<ProgramWeek> {
  const start = Date.now();

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const timeoutMs = getWeekTimeoutMs(requestDeadline);
      if (timeoutMs < PROGRAM_WEEK_MIN_TIMEOUT_MS) {
        throw AppError.serviceUnavailable(
          "L'IA met trop de temps à générer le programme, veuillez réessayer dans quelques instants",
        );
      }

      const week = await callAiForWeek(input, weekNumber, aiConfig, timeoutMs);
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

      if (error instanceof AiTimeoutError) {
        throw AppError.serviceUnavailable(
          "L'IA met trop de temps à générer une semaine du programme, veuillez réessayer dans quelques instants",
        );
      }

      if (attempt === 2 || !hasRetryBudget(requestDeadline)) {
        throw AppError.serviceUnavailable(
          "Impossible de générer le programme d'entraînement, veuillez réessayer",
        );
      }
    }
  }

  throw AppError.internal('Erreur inattendue dans generateWeekWithRetry');
}

function getWeekTimeoutMs(requestDeadline: number): number {
  const remainingMs = requestDeadline - Date.now() - PROGRAM_PROVIDER_MARGIN_MS;
  return Math.min(PROGRAM_WEEK_AI_TIMEOUT_MS, Math.max(0, remainingMs));
}

function hasRetryBudget(requestDeadline: number): boolean {
  return Date.now() + PROGRAM_RETRY_MIN_BUDGET_MS < requestDeadline;
}

export async function generateProgram(
  input: GenerateProgramInput,
  aiConfig: AiConfig,
): Promise<TrainingProgram> {
  const globalStart = Date.now();
  const requestDeadline = globalStart + PROGRAM_REQUEST_DEADLINE_MS;
  const weeks = await Promise.all(
    Array.from({ length: input.weeks_count }, (_, index) =>
      generateWeekWithRetry(input, index + 1, aiConfig, requestDeadline),
    ),
  );

  weeks.sort((a, b) => a.week_number - b.week_number);

  const levelLabel =
    input.level === 'beginner' ? 'Débutant' : input.level === 'intermediate' ? 'Intermédiaire' : 'Avancé';

  const program: TrainingProgram = normalizeTrainingProgramDurations({
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
  });

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
