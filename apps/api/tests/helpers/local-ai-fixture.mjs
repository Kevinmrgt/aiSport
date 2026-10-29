import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

export function assertLocalTestDatabase(value) {
  const url = new URL(value);
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['127.0.0.1', 'localhost', '::1', '[::1]'].includes(url.hostname) ||
    !/test|audit/i.test(decodeURIComponent(url.pathname))
  ) {
    throw new Error('An explicit local test or audit PostgreSQL database is required');
  }
  return url;
}

function requestData(prompt) {
  for (const line of prompt.split(/\r?\n/)) {
    if (!line.trim().startsWith('{')) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed.request?.sport || parsed.sport) return parsed;
    } catch {
      /* Schema examples are not the one-line request payload. */
    }
  }
  throw new Error('Unknown local fixture request format');
}

function session(minutes, number = 1) {
  return {
    session_number: number,
    title: `Séance locale ${number}`,
    focus: 'Endurance facile',
    duration_minutes: minutes,
    warmup: [
      { name: 'Mobilité locale', description: 'Mouvements progressifs', duration_seconds: 60 },
    ],
    exercises: [
      {
        name: 'Marche locale',
        description: 'Allure facile et régulière',
        duration_seconds: minutes * 60 - 180,
        rest_seconds: 60,
        tips: 'Rester à une allure confortable',
      },
    ],
    cooldown: [
      { name: 'Retour calme local', description: 'Ralentir progressivement', duration_seconds: 60 },
    ],
  };
}

export function fixtureContent(prompt) {
  const data = requestData(prompt);
  const input = data.request ?? data;
  if (data.request) {
    return {
      week_number: data.weekNumber,
      theme: 'Progression locale',
      objective: 'Rester régulier',
      sessions: Array.from({ length: input.sessions_per_week }, (_, index) =>
        session(input.session_duration_minutes, index + 1),
      ),
    };
  }
  const generated = session(input.duration_minutes);
  return {
    title: 'Séance de recette locale',
    sport: input.sport,
    difficulty: input.level,
    duration_minutes: input.duration_minutes,
    exercises: generated.exercises,
    warmup: generated.warmup,
    cooldown: generated.cooldown,
  };
}

export async function serveLocalFixture() {
  if (process.env.LOCAL_PRODUCTION_RECIPES !== '1')
    throw new Error('Explicit local recipe activation required');
  assertLocalTestDatabase(process.env.TEST_DATABASE_URL);
  if (
    process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL ||
    process.env.OPENAI_API_KEY !== 'local-fixture-no-real-api-key'
  ) {
    throw new Error(
      'Fixture environment must use its explicit test database and synthetic provider key',
    );
  }
  let attempts = 0;
  let simulatedFailures = 0;
  globalThis.fetch = async (target, options = {}) => {
    const url = new URL(typeof target === 'string' || target instanceof URL ? target : target.url);
    // No fallback to a real fetch: a changed provider URL must fail closed.
    if (url.href !== 'https://api.openai.com/v1/chat/completions' || options.method !== 'POST') {
      throw new Error('Outbound network request refused by local fixture');
    }
    const body = JSON.parse(options.body);
    const prompt = body.messages?.find((message) => message.role === 'user')?.content;
    if (typeof prompt !== 'string') throw new Error('Expected a text fixture request');
    attempts += 1;
    const data = requestData(prompt);
    const input = data.request ?? data;
    const fail = input.goals?.includes('fixture-indisponible');
    if (fail) simulatedFailures += 1;
    if (process.env.LOCAL_FIXTURE_COUNTER_FILE) {
      await writeFile(
        process.env.LOCAL_FIXTURE_COUNTER_FILE,
        JSON.stringify({ attempts, simulatedFailures }),
        { mode: 0o600 },
      );
    }
    if (fail) return new Response('{}', { status: 503, statusText: 'Local fixture unavailable' });
    return Response.json(
      {
        model: body.model,
        choices: [
          { finish_reason: 'stop', message: { content: JSON.stringify(fixtureContent(prompt)) } },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
      },
      { headers: { 'x-request-id': `local-fixture-${randomUUID()}` } },
    );
  };
  const { serve } = await import('@hono/node-server');
  const { app } = await import('../../dist/src/app.js');
  const server = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 3008 });
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
}

if (process.argv.includes('--serve')) {
  serveLocalFixture().catch(() => {
    console.error('Local fixture startup failed; no private diagnostics exported');
    process.exitCode = 1;
  });
}
