/**
 * Preview local isolé de la refonte. Vraie UI, Auth.js jury et server actions ;
 * API simulée en mémoire, aucun appel IA ni accès à une base réelle.
 * node scripts/refonte-preview.mjs [--production] [--generation-delay=25000]
 */
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendFileSync, mkdirSync } from 'node:fs';
import {
  WorkoutSchema,
  TrainingProgramSchema,
  GenerateWorkoutInputSchema,
  GenerateProgramInputSchema,
  CreateSessionLogInputSchema,
} from '../packages/shared/dist/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const production = process.argv.includes('--production');
const delayArg = process.argv.find((arg) => arg.startsWith('--generation-delay='));
const generationDelay = delayArg ? Number(delayArg.split('=')[1]) : 900;
if (!Number.isFinite(generationDelay) || generationDelay < 0 || generationDelay > 120_000) {
  throw new Error('--generation-delay doit être compris entre 0 et 120000 ms.');
}
const requireWeb = createRequire(resolve(root, 'apps/web/package.json'));
const out = resolve(root, 'output/design/refonte-verification');
mkdirSync(out, { recursive: true });
const fixtureId = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const date = (n) => new Date(Date.UTC(2026, 8, 9 - n, 10)).toISOString();
const events = [];
let used = 12,
  failure = null;
const routine = (title, sport = 'Musculation', level = 'intermediate', duration = 30) =>
  WorkoutSchema.parse({
    title,
    sport,
    difficulty: level,
    duration_minutes: duration,
    warmup: [
      {
        name: 'Échauffement',
        duration_seconds: 120,
        description: 'Mobilisez progressivement les épaules, les hanches et les chevilles.',
      },
    ],
    exercises: [
      {
        name: 'Squats',
        description: 'Pieds à la largeur des épaules, descendez en contrôlant le mouvement.',
        sets: 3,
        reps: 12,
        rest_seconds: 60,
        duration_seconds: Math.floor((duration * 60 - 360) / 3),
        tips: 'Gardez le dos neutre et les genoux dans l’axe des pieds.',
      },
      {
        name: 'Pompes',
        description: 'Gardez le corps aligné et adaptez l’appui à votre niveau.',
        sets: 3,
        reps: 10,
        rest_seconds: 60,
        duration_seconds: Math.floor((duration * 60 - 360) / 3),
        tips: 'Expirez pendant la poussée.',
      },
      {
        name: 'Gainage',
        description: 'Contractez les abdominaux en continuant à respirer.',
        rest_seconds: 0,
        duration_seconds: duration * 60 - 360 - 2 * Math.floor((duration * 60 - 360) / 3),
      },
    ],
    cooldown: [
      {
        name: 'Retour au calme',
        duration_seconds: 120,
        description: 'Relâchez les muscles et ralentissez progressivement votre respiration.',
      },
    ],
  });
const workoutRecord = (data, id = randomUUID(), createdAt = new Date().toISOString()) => ({
  id,
  title: data.title,
  sport: data.sport,
  difficulty: data.difficulty,
  durationMinutes: data.duration_minutes,
  exercises: data.exercises,
  warmup: data.warmup,
  cooldown: data.cooldown,
  createdAt,
});
const titles = [
  'Renforcement complet',
  'Endurance et mobilité',
  'Force du haut du corps',
  'Course progressive',
  'Mobilité active',
  'Renforcement du dos',
  'Cardio en douceur',
  'Jambes et stabilité',
  'Circuit complet',
  'Course fractionnée',
  'Équilibre et coordination',
  'Retour au mouvement',
];
let workouts = titles.map((title, n) =>
  workoutRecord(
    routine(
      title,
      ['Musculation', 'Course', 'Mobilité'][n % 3],
      ['intermediate', 'beginner', 'advanced'][n % 3],
      [30, 45, 20][n % 3],
    ),
    fixtureId(n + 1),
    date(n),
  ),
);
if (process.argv.includes('--timing')) {
  for (const circuit of [false, true]) {
    const names = circuit ? ['Pompes', 'Squats', 'Fentes'] : ['Pompes', 'Squats'];
    const sets = circuit ? 4 : 3;
    const rest = circuit ? 30 : 90;
    const data = WorkoutSchema.parse({
      planning_version: 2,
      title: circuit ? 'Circuit en quatre tours' : 'Séries à votre rythme',
      sport: 'Musculation',
      difficulty: 'beginner',
      duration_minutes: circuit ? 17 : 15,
      warmup: [
        {
          name: 'Échauffement',
          description: 'Mobilisez progressivement les articulations.',
          duration_seconds: 180,
        },
      ],
      cooldown: [
        {
          name: 'Retour au calme',
          description: 'Ralentissez et relâchez les muscles.',
          duration_seconds: 120,
        },
      ],
      exercises: names.map((name, index) => {
        const transition = !circuit || index === names.length - 1 ? 30 : 0;
        return {
          name,
          description: 'Gardez le corps aligné et contrôlez le mouvement.',
          tips: 'Expirez pendant la poussée.',
          sets,
          reps: 10,
          rest_seconds: transition,
          duration_seconds:
            sets * 30 + (circuit && index < names.length - 1 ? sets : sets - 1) * rest,
          prescription: {
            version: 2,
            category: 'strength',
            mode: 'repetitions',
            sets,
            reps: 10,
            work_seconds: 30,
            rest_seconds: rest,
            transition_seconds: transition,
            ...(circuit ? { circuit_id: 1 } : {}),
          },
        };
      }),
    });
    workouts.unshift(workoutRecord(data, fixtureId(circuit ? 99 : 98)));
  }
}
function programRecord(
  title,
  sport = 'Musculation',
  level = 'intermediate',
  weeks = 3,
  sessions = 3,
  duration = 30,
  id = randomUUID(),
  createdAt = new Date().toISOString(),
) {
  const data = TrainingProgramSchema.parse({
    title,
    sport,
    difficulty: level,
    weeks_count: weeks,
    sessions_per_week: sessions,
    session_duration_minutes: duration,
    progression_summary:
      'Des séances réparties sur la semaine avec une progression régulière du travail et de la récupération.',
    weeks: Array.from({ length: weeks }, (_, w) => ({
      week_number: w + 1,
      theme: ['Les bases', 'Progression', 'Consolidation', 'Autonomie'][w],
      objective: 'Conservez une exécution maîtrisée et adaptez votre rythme à vos sensations.',
      sessions: Array.from({ length: sessions }, (_, s) => {
        const r = routine(
          [
            'Renforcement complet',
            'Mobilité et endurance',
            'Force et stabilité',
            'Coordination',
            'Récupération active',
          ][s],
          sport,
          level,
          duration,
        );
        return {
          session_number: s + 1,
          title: r.title,
          focus: ['Tout le corps', 'Endurance', 'Stabilité', 'Coordination', 'Mobilité'][s],
          duration_minutes: duration,
          exercises: r.exercises,
          warmup: r.warmup,
          cooldown: r.cooldown,
        };
      }),
    })),
  });
  return {
    id,
    userId: 'jury-ui-preview',
    title,
    sport,
    difficulty: level,
    weeksCount: weeks,
    sessionsPerWeek: sessions,
    sessionDurationMinutes: duration,
    data,
    createdAt,
    updatedAt: createdAt,
  };
}
let programs = Array.from({ length: 10 }, (_, n) =>
  programRecord(
    ['Renforcement progressif', 'Reprise de la course', 'Mobilité au quotidien'][n % 3] +
      (n > 2 ? ` · Cycle ${n + 1}` : ''),
    ['Musculation', 'Course', 'Mobilité'][n % 3],
    ['intermediate', 'beginner', 'advanced'][n % 3],
    [3, 4, 2][n % 3],
    [3, 2, 4][n % 3],
    [30, 45, 20][n % 3],
    fixtureId(101 + n),
    date(n),
  ),
);
let logs = Array.from({ length: 8 }, (_, n) => ({
  id: fixtureId(201 + n),
  sourceType: 'workout',
  workoutId: workouts[n].id,
  title: workouts[n].title,
  sport: workouts[n].sport,
  difficulty: workouts[n].difficulty,
  plannedDurationMinutes: workouts[n].durationMinutes,
  durationSeconds: 1800,
  perceivedEffort: [6, 7, 6, 8, 5, 6, 7, 7][n],
  feedback: ['good', 'good', 'too_easy', 'good', 'too_hard', 'good', 'good', 'too_easy'][n],
  completedAt: date(n),
  createdAt: date(n),
  notes: null,
  painNotes: null,
}));
const secret = randomBytes(32).toString('base64url');
const record = (method, path, payload) => {
  events.push({ method, path, payload, time: new Date().toISOString() });
  appendFileSync(resolve(out, 'api-events.jsonl'), JSON.stringify(events.at(-1)) + '\n');
};
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:3101');
  const send = (value, code = 200) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(value));
  };
  try {
    if (url.pathname === '/__qa' && req.method === 'GET')
      return send({
        fixture: true,
        workouts: workouts.length,
        programs: programs.length,
        logs,
        events,
        used,
      });
    if (url.pathname === '/__qa' && req.method === 'POST') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const control = JSON.parse(raw);
      if ('failure' in control) failure = control.failure;
      if ('used' in control) used = control.used;
      return send({ fixture: true, used, failure });
    }
    if (
      req.headers['x-internal-secret'] !== secret ||
      req.headers['x-user-id'] !== 'jury-ui-preview'
    )
      return send({ message: 'Non autorisé', statusCode: 401 }, 401);
    const path = url.pathname,
      method = req.method;
    let body = '';
    for await (const chunk of req) body += chunk;
    const input = body ? JSON.parse(body) : undefined;
    record(method, path, input);
    if (failure && (failure === path || failure === method)) {
      failure = null;
      return send({ message: 'Erreur locale simulée. Réessayez.', statusCode: 503 }, 503);
    }
    if (path === '/generation-quota')
      return send({ limited: true, limit: 30, used, remaining: Math.max(0, 30 - used) });
    if (path === '/workouts/stats')
      return send({
        total: workouts.length,
        byLevel: Object.fromEntries(
          ['beginner', 'intermediate', 'advanced'].map((l) => [
            l,
            workouts.filter((w) => w.difficulty === l).length,
          ]),
        ),
        bySport: workouts.reduce((acc, w) => ({ ...acc, [w.sport]: (acc[w.sport] ?? 0) + 1 }), {}),
        lastGenerated: workouts[0]?.createdAt ?? null,
      });
    if (path === '/session-logs/stats')
      return send({
        totalCompleted: logs.length,
        totalDurationSeconds: logs.reduce((s, l) => s + l.durationSeconds, 0),
        averageEffort: logs.length
          ? logs.reduce((s, l) => s + l.perceivedEffort, 0) / logs.length
          : null,
        feedbackCounts: Object.fromEntries(
          ['too_easy', 'good', 'too_hard'].map((f) => [
            f,
            logs.filter((l) => l.feedback === f).length,
          ]),
        ),
        lastCompletedAt: logs[0]?.completedAt ?? null,
      });
    if (path === '/session-logs' && method === 'POST') {
      const payload = CreateSessionLogInputSchema.parse(input);
      const result = { id: randomUUID(), ...payload, createdAt: new Date().toISOString() };
      logs.unshift(result);
      return send(result, 201);
    }
    if (path === '/session-logs/recent')
      return send(logs.slice(0, Number(url.searchParams.get('limit') ?? 6)));
    if (path.endsWith('/generate') && method === 'POST') {
      if (used >= 30) return send({ message: 'Quota de génération atteint', statusCode: 429 }, 429);
      await new Promise((r) => setTimeout(r, generationDelay));
      if (path === '/workouts/generate') {
        const p = GenerateWorkoutInputSchema.parse(input);
        const w = workoutRecord(
          routine('Séance personnalisée', p.sport, p.level, p.duration_minutes),
        );
        workouts.unshift(w);
        used++;
        return send(w, 201);
      }
      const p = GenerateProgramInputSchema.parse(input);
      const result = programRecord(
        'Programme personnalisé',
        p.sport,
        p.level,
        p.weeks_count,
        p.sessions_per_week,
        p.session_duration_minutes,
      );
      programs.unshift(result);
      used++;
      return send(result, 201);
    }
    for (const [base, source] of [
      ['workouts', workouts],
      ['programs', programs],
    ]) {
      if (path === '/' + base) {
        const page = Math.max(1, Number(url.searchParams.get('page') ?? 1)),
          limit = Number(url.searchParams.get('limit') ?? 9);
        let filtered = source;
        if (base === 'workouts')
          filtered = source.filter(
            (w) =>
              (!url.searchParams.get('sport') ||
                w.sport.toLowerCase().includes(url.searchParams.get('sport').toLowerCase())) &&
              (!url.searchParams.get('level') || w.difficulty === url.searchParams.get('level')),
          );
        return send({
          [base]: filtered.slice((page - 1) * limit, page * limit),
          total: filtered.length,
          page,
          limit,
          hasMore: page * limit < filtered.length,
        });
      }
      if (path.startsWith('/' + base + '/')) {
        const index = source.findIndex((x) => x.id === path.split('/')[2]);
        if (index < 0) return send({ message: 'Ressource introuvable', statusCode: 404 }, 404);
        if (method === 'DELETE') {
          source.splice(index, 1);
          return send({ success: true });
        }
        return send(source[index]);
      }
    }
    return send({ message: 'Introuvable', statusCode: 404 }, 404);
  } catch (error) {
    send({ message: error.message, statusCode: 400 }, 400);
  }
});
await new Promise((r) => server.listen(3101, '127.0.0.1', r));
const salt = randomBytes(16);
const previewPassword = randomBytes(32).toString('base64url');
const hash = [
  'scrypt',
  16384,
  8,
  1,
  salt.toString('base64url'),
  scryptSync(previewPassword, salt, 32, { N: 16384, r: 8, p: 1, maxmem: 67108864 }).toString(
    'base64url',
  ),
].join('$');
const child = spawn(
  process.execPath,
  [
    requireWeb.resolve('next/dist/bin/next'),
    production ? 'start' : 'dev',
    '--hostname',
    '127.0.0.1',
    '--port',
    '3100',
  ],
  {
    cwd: resolve(root, 'apps/web'),
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: production ? 'production' : 'development',
      API_URL: 'http://127.0.0.1:3101',
      NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3101',
      AUTH_URL: 'http://127.0.0.1:3100',
      NEXTAUTH_URL: 'http://127.0.0.1:3100',
      AUTH_SECRET: randomBytes(32).toString('base64url'),
      SERVICE_SECRET: secret,
      ALCIDE_LOCAL_PREVIEW: 'true',
      ALCIDE_PREVIEW_PASSWORD: previewPassword,
      AUTH_GOOGLE_ID: '',
      AUTH_GOOGLE_SECRET: '',
      OPENAI_API_KEY: '',
      JURY_ACCESS_ENABLED: 'true',
      JURY_ACCESS_IDENTIFIER: 'ui-preview',
      JURY_ACCESS_PASSWORD_HASH: hash,
      JURY_ACCESS_USER_ID: 'jury-ui-preview',
      JURY_ACCESS_EMAIL: 'ui-preview@alcide.invalid',
      JURY_ACCESS_NAME: 'Compte de test',
      JURY_ACCESS_EXPIRES_AT: new Date(Date.now() + 8 * 3600000).toISOString(),
      JURY_ACCESS_SESSION_VERSION: randomBytes(16).toString('base64url'),
    },
  },
);
for (const stream of [child.stdout, child.stderr])
  stream.on('data', (chunk) => {
    const clean = String(chunk)
      .replaceAll(secret, '[redacted]')
      .replaceAll(hash, '[redacted]')
      .replaceAll(previewPassword, '[redacted]');
    appendFileSync(resolve(out, 'next-preview.log'), clean);
    if (/Ready in|Error:|error:/.test(clean)) console.log(clean.slice(0, 1600));
  });
child.on('exit', (code) => {
  server.close();
  process.exitCode = code ?? 0;
});
process.on('SIGINT', () => {
  child.kill();
  server.close();
});
console.log('Preview locale : http://127.0.0.1:3100 — API de test en mémoire uniquement.');
