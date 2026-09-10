import { ProgramWeekSchema, TrainingProgramSchema } from '@alcide/shared';
import type { ProgramWeek, TrainingProgram, GenerateProgramInput } from '@alcide/shared';
import { AppError } from '../types/app-error.js';
import { AiTimeoutError, callAiProvider } from './ai.service.js';
import type { AiConfig } from './ai.service.js';
import { weekOutputSchema } from './training-output-schema.js';
import {
  correctionFeedback,
  generationDiagnostics,
  DraftWeekSchema,
  planSession,
  PRESCRIPTION_PROMPT,
  SessionPlanningError,
} from './session-planner.service.js';

function getProgressionPhase(weekNumber: number, totalWeeks: number): string {
  if (weekNumber === 1) return 'Adaptation - charges legeres, apprentissage des mouvements';
  if (weekNumber === totalWeeks)
    return 'Consolidation - conserver une technique maîtrisée et un volume soutenable';
  return 'Progression modérée - une seule variable à la fois, récupération et technique prioritaires';
}

const SYSTEM_MESSAGE =
  'Tu es Alcide, un coach IA sportif expert en planification de programmes progressifs. ' +
  "Tu prepares chaque semaine comme un accompagnement personnalise pour l'utilisateur. " +
  'Reponds UNIQUEMENT avec un JSON valide, sans texte avant ou apres.';

// Chaque semaine est generee en parallele. Le budget global evite les 504 Vercel
// quand une tentative lente revient invalide puis declenche un retry.
const PROGRAM_WEEK_AI_TIMEOUT_MS = 45_000;
const PROGRAM_REQUEST_DEADLINE_MS = 55_000;
const PROGRAM_RETRY_MIN_BUDGET_MS = 8_000;
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

  return `Genere les seances de la semaine ${weekNumber} sur ${input.weeks_count} d'un programme de ${input.sport}.

Niveau : ${input.level}
Duree par seance : ${input.session_duration_minutes} minutes
Nombre de seances : ${input.sessions_per_week}
Phase : ${phaseLabel}
Objectifs : ${input.goals}
${constraints}

Contraintes de sortie :
- exactement ${input.sessions_per_week} seances
- descriptions et conseils en moins de 90 caracteres
- JSON compact, sans markdown
- Organise une alternance cohérente des mouvements et de la récupération sur ${input.sessions_per_week} séances. Ne répète pas une séance intense ciblant les mêmes muscles à chaque fois.
- Toutes les semaines suivent le même cadre : adaptation, progression modérée éventuelle, consolidation ; jamais de charges maximales automatiques. Ne prétends pas connaître les charges ou les résultats des autres semaines.
- La durée demandée s'applique à CHAQUE séance, pas à la semaine. Calcule et vérifie chaque séance séparément ; prévois assez de mouvements et de séries dans chacune pour couvrir son créneau.
${PRESCRIPTION_PROMPT}

Reponds UNIQUEMENT avec ce JSON (et rien d'autre) :
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
      "exercises": [{ "name": "string", "description": "string", "prescription": { "version": 2, "category": "strength", "mode": "repetitions", "sets": 3, "reps": 10, "work_seconds": 30, "rest_seconds": 90, "transition_seconds": 30 }, "tips": "string optionnel" }],
      "warmup": [{ "name": "string", "duration_seconds": number, "description": "string" }],
      "cooldown": [{ "name": "string", "duration_seconds": number, "description": "string" }]
    }
  ]
}`;
}

function logAiProgramCall(data: {
  success: boolean;
  weekNumber: number;
  attempt: number;
  durationMs: number;
  diagnostic?: ReturnType<typeof generationDiagnostics>;
}): void {
  console.info('[AiProgramService]', {
    ...data,
    timestamp: new Date().toISOString(),
  });
}

function validateWeek(input: GenerateProgramInput, weekNumber: number, json: string): ProgramWeek {
  const validated = DraftWeekSchema.parse(JSON.parse(json));
  const sessionNumbers = validated.sessions.map((session) => session.session_number);
  if (
    validated.week_number !== weekNumber ||
    validated.sessions.length !== input.sessions_per_week ||
    validated.sessions.some(
      (session) => session.duration_minutes !== input.session_duration_minutes,
    ) ||
    sessionNumbers.some((number, index) => number !== index + 1)
  ) {
    throw new Error(
      `La semaine ${weekNumber} ne correspond pas aux parametres demandes ` +
        `(${input.sessions_per_week} seances de ${input.session_duration_minutes} minutes)`,
    );
  }

  const planningIssues: string[] = [];
  const sessions = validated.sessions.flatMap((session) => {
    try {
      return [planSession(session, input.level)];
    } catch (error) {
      if (error instanceof SessionPlanningError) {
        planningIssues.push(
          ...error.issues.map((issue) => `Séance ${session.session_number} : ${issue}`),
        );
        return [];
      }
      throw error;
    }
  });
  if (planningIssues.length) throw new SessionPlanningError(planningIssues);
  return ProgramWeekSchema.parse({ ...validated, sessions });
}

async function generateWeekWithRetry(
  input: GenerateProgramInput,
  weekNumber: number,
  aiConfig: AiConfig,
  requestDeadline: number,
): Promise<ProgramWeek> {
  const start = Date.now();
  let feedback = '';
  const prompt = `${SYSTEM_MESSAGE}\n\n${buildWeekPrompt(input, weekNumber, getProgressionPhase(weekNumber, input.weeks_count))}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    let previousJson = '';
    try {
      const timeoutMs = getWeekTimeoutMs(requestDeadline);
      if (timeoutMs < PROGRAM_WEEK_MIN_TIMEOUT_MS) {
        throw AppError.serviceUnavailable(
          'Alcide met trop de temps a generer le programme, veuillez reessayer dans quelques instants',
        );
      }

      const content = await callAiProvider(aiConfig, prompt + feedback, {
        timeoutMs,
        temperature: 0.2,
        maxTokens: Math.min(11000, 1500 + input.sessions_per_week * 1800),
        jsonSchema: weekOutputSchema(input, weekNumber),
      });
      previousJson = content.match(/\{[\s\S]*\}/)?.[0] ?? '';
      if (!previousJson) throw new Error('Aucun JSON trouve dans la reponse IA');
      const week = validateWeek(input, weekNumber, previousJson);
      logAiProgramCall({
        success: true,
        weekNumber,
        attempt,
        durationMs: Date.now() - start,
      });
      return week;
    } catch (error) {
      feedback = correctionFeedback(error, previousJson);
      logAiProgramCall({
        success: false,
        weekNumber,
        attempt,
        durationMs: Date.now() - start,
        diagnostic: generationDiagnostics(error),
      });

      if (error instanceof AiTimeoutError) {
        throw AppError.serviceUnavailable(
          'Alcide met trop de temps a generer une semaine du programme, veuillez reessayer dans quelques instants',
        );
      }

      if (attempt === 2 || !hasRetryBudget(requestDeadline)) {
        throw AppError.serviceUnavailable(
          "Alcide n'a pas pu generer le programme d'entrainement, veuillez reessayer",
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
  return Date.now() + PROGRAM_RETRY_MIN_BUDGET_MS + PROGRAM_PROVIDER_MARGIN_MS < requestDeadline;
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
    input.level === 'beginner'
      ? 'Debutant'
      : input.level === 'intermediate'
        ? 'Intermediaire'
        : 'Avance';

  const program: TrainingProgram = {
    planning_version: 2,
    title: `Programme Alcide ${input.sport} - ${input.weeks_count} semaines (${levelLabel})`,
    sport: input.sport,
    difficulty: input.level,
    weeks_count: input.weeks_count,
    sessions_per_week: input.sessions_per_week,
    session_duration_minutes: input.session_duration_minutes,
    progression_summary:
      `Alcide planifie ${input.weeks_count} semaines progressives en ${input.sport} pour un niveau ${levelLabel}. ` +
      `${input.sessions_per_week} seances de ${input.session_duration_minutes} minutes par semaine. ` +
      `Objectifs : ${input.goals}`,
    weeks,
  };

  const validated = TrainingProgramSchema.safeParse(program);
  if (!validated.success) {
    console.error('[AiProgramService] Validation finale echouee:', validated.error.issues);
    throw AppError.internal('Erreur lors de la validation du programme genere');
  }

  console.info('[AiProgramService] Programme genere avec succes', {
    weeksCount: input.weeks_count,
    totalDurationMs: Date.now() - globalStart,
    timestamp: new Date().toISOString(),
  });

  return validated.data;
}
