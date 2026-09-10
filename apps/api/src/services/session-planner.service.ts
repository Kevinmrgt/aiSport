import { z } from 'zod';
import {
  PrescriptionSchema,
  PhaseSchema,
  buildSessionSchedule,
  getExerciseGroups,
  getPrescriptionLimits,
  getPrescriptionIssues,
  getStrengthSetLimit,
  getSessionPrescriptionIssues,
  getSessionTiming,
} from '@alcide/shared';
import type { Exercise, Phase, TrainingLevel } from '@alcide/shared';

export const DraftExerciseSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(300),
  tips: z.string().max(250).optional(),
  prescription: PrescriptionSchema,
});
export const DraftSessionFields = {
  duration_minutes: z.number().int().min(15).max(180),
  exercises: z.array(DraftExerciseSchema).min(1).max(16),
  warmup: z.array(PhaseSchema).min(1).max(6),
  cooldown: z.array(PhaseSchema).min(1).max(6),
};
export const DraftWorkoutSchema = z.object({
  title: z.string().min(1),
  sport: z.string().min(1),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  ...DraftSessionFields,
});
export const DraftWeekSchema = z.object({
  week_number: z.number().int().min(1),
  theme: z.string().min(1),
  objective: z.string().min(1),
  sessions: z
    .array(
      z.object({
        session_number: z.number().int().min(1),
        title: z.string().min(1),
        focus: z.string().min(1),
        ...DraftSessionFields,
      }),
    )
    .min(1)
    .max(5),
});

type DraftSession = {
  duration_minutes: number;
  exercises: z.infer<typeof DraftExerciseSchema>[];
  warmup: Phase[];
  cooldown: Phase[];
};

export class SessionPlanningError extends Error {
  constructor(issues: string[]) {
    super(issues.slice(0, 8).join('; '));
    this.name = 'SessionPlanningError';
  }
}

/** Aggregate compatibility fields for older clients; prescription remains the source of truth. */
export function withTimingFields(exercise: z.infer<typeof DraftExerciseSchema>): Exercise {
  const p = exercise.prescription;
  return {
    ...exercise,
    sets: p.sets,
    ...(p.reps !== undefined ? { reps: p.reps } : {}),
    duration_seconds: p.sets * p.work_seconds + (p.sets - 1) * p.rest_seconds,
    rest_seconds: p.transition_seconds,
  };
}

function compatibilityProjection(exercises: Exercise[]): Exercise[] {
  const steps = buildSessionSchedule(exercises);
  return exercises.map((exercise, index) => ({
    ...exercise,
    duration_seconds: steps
      .filter((step) => step.exerciseIndex === index && step.type !== 'transition')
      .reduce((total, step) => total + step.plannedSeconds, 0),
    rest_seconds: exercise.prescription!.transition_seconds,
  }));
}

export function planSession<T extends DraftSession>(
  draft: T,
  level: TrainingLevel,
): Omit<T, 'exercises'> & { exercises: Exercise[]; planning_version: 2 } {
  const exercises = draft.exercises.map(withTimingFields);
  const initialIssues = getSessionPrescriptionIssues(
    { ...draft, exercises },
    level,
    draft.duration_minutes,
    false,
  );
  if (initialIssues.length) throw new SessionPlanningError(initialIssues);
  const target = draft.duration_minutes * 60;
  const phases = getSessionTiming([], draft.warmup, draft.cooldown).plannedSeconds;
  // Do not change a valid prescription merely because another exact fit is possible.
  if (
    getSessionPrescriptionIssues({ ...draft, exercises }, level, draft.duration_minutes).length ===
    0
  ) {
    return { ...draft, exercises: compatibilityProjection(exercises), planning_version: 2 };
  }
  type Choice = { exercises: Exercise[]; cost: number; seconds: number; strengthSets: number };
  let states = new Map<string, Choice>([
    ['0:0', { exercises: [], cost: 0, seconds: 0, strengthSets: 0 }],
  ]);
  for (const group of getExerciseGroups(exercises)) {
    const members = group.map((index) => exercises[index]!);
    const first = members[0]!.prescription!;
    const maximumSets = Math.min(
      ...members.map((ex) => getPrescriptionLimits(ex.prescription!, level).maxSets),
    );
    const variants: Omit<Choice, 'seconds' | 'strengthSets'>[] = [];
    if (first.mode === 'continuous') {
      const limits = getPrescriptionLimits(first, level);
      for (
        let seconds = limits.minWork;
        seconds <= Math.min(limits.maxWork, target - phases);
        seconds += 60
      ) {
        variants.push({
          exercises: members.map((ex) =>
            withTimingFields({
              ...ex,
              prescription: { ...ex.prescription!, work_seconds: seconds },
            }),
          ),
          cost: Math.abs(seconds - first.work_seconds) / 60,
        });
      }
    } else {
      for (let sets = 1; sets <= maximumSets; sets++) {
        variants.push({
          exercises: members.map((ex) =>
            withTimingFields({ ...ex, prescription: { ...ex.prescription!, sets } }),
          ),
          cost: Math.abs(sets - first.sets) * 4,
        });
      }
    }
    const validVariants = variants
      .filter((variant) =>
        variant.exercises.every((ex) => getPrescriptionIssues(ex, level).length === 0),
      )
      .map((variant) => ({
        ...variant,
        seconds: getSessionTiming(variant.exercises).plannedSeconds,
        strengthSets: variant.exercises.reduce(
          (sum, ex) => sum + (ex.prescription!.category === 'strength' ? ex.prescription!.sets : 0),
          0,
        ),
      }));
    const next = new Map<string, Choice>();
    for (const state of states.values()) {
      for (const variant of validVariants) {
        const duration = state.seconds + variant.seconds;
        if (duration + phases > target) continue;
        const strengthSets = state.strengthSets + variant.strengthSets;
        if (strengthSets > getStrengthSetLimit(level)) continue;
        const cost = state.cost + variant.cost;
        const key = `${duration}:${strengthSets}`;
        if (!next.has(key) || next.get(key)!.cost > cost) {
          next.set(key, {
            exercises: [...state.exercises, ...variant.exercises],
            cost,
            seconds: duration,
            strengthSets,
          });
        }
      }
    }
    states = next;
  }
  const candidate = [...states.values()]
    .filter((choice) => choice.seconds + phases >= target - 60)
    .sort((a, b) => a.cost - b.cost || b.seconds - a.seconds)
    .find(
      (choice) =>
        getSessionPrescriptionIssues(
          { ...draft, exercises: choice.exercises },
          level,
          draft.duration_minutes,
        ).length === 0,
    );
  if (!candidate)
    throw new SessionPlanningError([
      `Impossible de composer ${draft.duration_minutes}min (tolérance -60s) avec ces mouvements et des séries adaptées. ` +
        'Change le nombre ou le choix des mouvements, propose des blocs cohérents ; ne prolonge pas un exercice de force ou de gainage pour remplir le temps.',
    ]);
  return { ...draft, exercises: compatibilityProjection(candidate.exercises), planning_version: 2 };
}

export const PRESCRIPTION_PROMPT = `
Construis une séance adaptée au sport, au niveau, aux objectifs et au matériel.
Une prescription par mouvement :
{"version":2,"category":"strength|isometric|cardio|mobility|technique","mode":"repetitions|interval|continuous|mobility","sets":3,"reps":10,"work_seconds":30,"rest_seconds":90,"transition_seconds":30}
- repetitions : force, nombre entier de répétitions (4–15 débutant, 4–25 autres), work_seconds = estimation par série (2–5s/répétition, arrondie à 5s). L'utilisateur termine chaque série manuellement.
- interval : effort chronométré PAR SÉRIE. continuous : uniquement cardio continu, 1 série et minutes entières. mobility : mobilité.
- Pompes, squats, fentes, burpees = strength ; gainage/planche/chaise = isometric. Ne déguise pas ces mouvements en cardio continu.
- Force : effort par série 10–60s débutant, jusqu'à 90s intermédiaire ou 120s avancé ; maximum 4/5/6 séries selon le niveau.
- Isométrie : 10–45s débutant, jusqu'à 60s intermédiaire, 90s avancé ; maximum 4/5/6 séries.
- Mobilité : 15–90s, 1–4 séries. Technique : 10–180s. Cardio fractionné : 10–300s, maximum 12 intervalles. Cardio continu : 5–60min débutant, jusqu'à 120min intermédiaire et 180min avancé.
- Repos choisis dès le départ parmi 0,10,15,20,30,45,60,90,120,180,240,300s selon le travail ; au moins 30s entre séries de force, 15s isométrie, 10s intervalles cardio/technique. Une force exigeante privilégie 90–180s ; aucun repos ne sert à remplir le créneau.
- Transition après le mouvement : 0,15,30,45 ou60s. Ne compte pas deux fois le même repos/temps d'installation. Efforts par paliers de5s ; reps absent hors mode repetitions.
- Circuit facultatif : circuit_id entier identique sur des mouvements consécutifs, tous avec le même nombre de tours (sets). rest_seconds après chaque effort sauf le tout dernier ; transition_seconds uniquement sur le dernier mouvement du circuit. Pas de cardio continu en circuit.
- Échauffement et retour au calme obligatoires, descriptions techniques conservées, durées par paliers de30s. Échauffement 3–15min et <=30% du créneau ; retour 2–10min et <=20%.
- Au maximum 24 séries de force au total débutant,32 intermédiaire,40 avancé. Pas d'échec musculaire ni charges maximales imposés par défaut.
- Choisis assez de mouvements ou de tours pour approcher le créneau sans dépasser : cible moins60s à cible. Le calcul final ajuste seulement les séries/tours ou le cardio continu, jamais la durée d'une série de force ni les repos.
- Nombre de mouvements selon le sport (1–16), aucune limite fixe de deux exercices. La description et les conseils décrivent la technique, sans répéter les nombres de séries ou durées.
`;
