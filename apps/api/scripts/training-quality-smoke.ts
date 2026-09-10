/** Opt-in paid provider check, synthetic inputs only, no database or user account access. */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { getSessionTiming, type GenerateWorkoutInput } from '@alcide/shared';
import { generateWorkout } from '../src/services/workout-ai.service.js';
import { generateProgram } from '../src/services/program-ai.service.js';

if (!process.argv.includes('--live'))
  throw new Error('Explicit --live flag required (uses paid API calls).');
config({ path: resolve(process.cwd(), process.env.TRAINING_QA_ENV_FILE ?? '.env.local') });
const apiKey = process.env.OPENAI_API_KEY;
const directory = resolve(process.cwd(), '../../output/design/timing-validation');
await mkdir(directory, { recursive: true });
if (!apiKey) {
  await writeFile(
    resolve(directory, 'live-results.json'),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        configurationError: 'OPENAI_API_KEY missing',
        results: [],
      },
      null,
      2,
    ),
  );
  throw new Error('OPENAI_API_KEY missing');
}
const ai = {
  provider: 'openai' as const,
  apiKey,
  ...(process.env.OPENAI_MODEL ? { model: process.env.OPENAI_MODEL } : {}),
};
const cases: GenerateWorkoutInput[] = [
  {
    sport: 'boxe anglaise',
    level: 'intermediate',
    duration_minutes: 60,
    goals: 'entrainement explosivité',
    constraints: 'sac de frappe',
  },
  {
    sport: 'Musculation',
    level: 'intermediate',
    duration_minutes: 55,
    goals: 'Renforcement complet',
    constraints: 'Haltères légers et poids du corps',
  },
  {
    sport: 'Course à pied',
    level: 'beginner',
    duration_minutes: 30,
    goals: 'Endurance à allure confortable',
  },
  {
    sport: 'Musculation',
    level: 'beginner',
    duration_minutes: 20,
    goals: 'Circuit de renforcement complet',
    constraints: 'Sans matériel, circuit de plusieurs mouvements',
  },
  {
    sport: 'Mobilité',
    level: 'beginner',
    duration_minutes: 20,
    goals: 'Mobilité générale douce',
    constraints: 'Tapis uniquement',
  },
];
const results: unknown[] = [];
let failures = 0;
// Capture only synthetic provider outputs for failed QA cases, never request headers or secrets.
let drafts: string[] = [];
const providerFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  const response = await providerFetch(...args);
  if (response.ok) {
    const data = (await response.clone().json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (content) drafts.push(content);
  }
  return response;
};
function showDrafts() {
  for (const [index, raw] of drafts.entries()) {
    try {
      const draft = JSON.parse(raw) as {
        exercises?: unknown[];
        sessions?: { exercises?: unknown[] }[];
        warmup?: unknown;
        cooldown?: unknown;
      };
      console.info(
        'QA_DRAFT_PHASES',
        index,
        JSON.stringify({ warmup: draft.warmup, cooldown: draft.cooldown }),
      );
      for (const exercise of draft.exercises ??
        draft.sessions?.flatMap((session) => session.exercises ?? []) ??
        [])
        console.info('QA_DRAFT_EXERCISE', index, JSON.stringify(exercise));
    } catch {
      console.info('QA_DRAFT_INVALID_JSON', index);
    }
  }
}
const selectedCases = process.argv.includes('--boxing')
  ? Array.from({ length: 3 }, () => cases[0]!)
  : cases;
for (const input of selectedCases) {
  drafts = [];
  const start = Date.now();
  try {
    const workout = await generateWorkout(input, ai);
    const timing = getSessionTiming(workout.exercises, workout.warmup, workout.cooldown);
    results.push({ input, success: true, elapsedMs: Date.now() - start, timing, workout });
    console.info('PASS', input.sport, input.duration_minutes, timing);
    console.info('QA_RESULT', JSON.stringify({ input, timing, workout }));
  } catch (error) {
    failures++;
    results.push({
      input,
      success: false,
      elapsedMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    console.info('FAIL', input.sport, input.duration_minutes);
    showDrafts();
  }
}
if (!process.argv.includes('--boxing'))
  try {
    drafts = [];
    const program = await generateProgram(
      {
        sport: 'Musculation',
        level: 'beginner',
        weeks_count: 2,
        sessions_per_week: 2,
        session_duration_minutes: 30,
        goals: 'Apprentissage progressif des mouvements',
        constraints: 'Poids du corps et haltères légers',
      },
      ai,
    );
    results.push({ success: true, program });
    console.info('PASS program', program.weeks.length, 'weeks');
  } catch (error) {
    failures++;
    results.push({
      success: false,
      program: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    console.info('FAIL program');
    showDrafts();
  }
await writeFile(
  resolve(directory, 'live-results.json'),
  JSON.stringify({ at: new Date().toISOString(), results }, null, 2),
);
process.exitCode = failures ? 1 : 0;
