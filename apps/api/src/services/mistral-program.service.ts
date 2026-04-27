import { ProgramWeekSchema, TrainingProgramSchema } from '@sportcoach/shared';
import type { ProgramWeek, TrainingProgram, GenerateProgramInput } from '@sportcoach/shared';
import { AppError } from '../types/app-error.js';
import { callAiProvider } from './ai.service.js';
import type { AiConfig } from './ai.service.js';

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

async function callAiForWeek(
  input: GenerateProgramInput,
  weekNumber: number,
  aiConfig: AiConfig,
): Promise<ProgramWeek> {
  const phaseLabel = getProgressionPhase(weekNumber, input.weeks_count);
  // Fusionner le message système dans le prompt pour la compatibilité multi-providers
  const prompt = `${SYSTEM_MESSAGE}\n\n${buildWeekPrompt(input, weekNumber, phaseLabel)}`;

  const content = await callAiProvider(aiConfig, prompt);

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
): Promise<ProgramWeek> {
  const start = Date.now();

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const week = await callAiForWeek(input, weekNumber, aiConfig);
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

  throw AppError.internal('Erreur inattendue dans generateWeekWithRetry');
}

export async function generateProgram(
  input: GenerateProgramInput,
  aiConfig: AiConfig,
): Promise<TrainingProgram> {
  const globalStart = Date.now();
  const weeks: ProgramWeek[] = [];

  // Appels séquentiels (pas parallèle — budget temps Vercel + concurrence API)
  for (let weekNumber = 1; weekNumber <= input.weeks_count; weekNumber++) {
    const week = await generateWeekWithRetry(input, weekNumber, aiConfig);
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
