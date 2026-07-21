const requestCountArgument = process.argv.slice(2).find((argument) => argument !== '--');
const requestCount = Number.parseInt(requestCountArgument ?? '50', 10);
const maxP95Ms = Number.parseInt(process.env.MAX_P95_MS ?? '1000', 10);

if (!Number.isInteger(requestCount) || requestCount < 1 || requestCount > 500) {
  throw new Error('Le nombre de requêtes doit être un entier compris entre 1 et 500.');
}

const endpoints = [
  {
    name: 'web-health',
    url: 'https://ai-sport-web.vercel.app/api/health',
    expectedStatus: 'ok',
  },
  {
    name: 'api-liveness',
    url: 'https://ai-sport-api.vercel.app/health',
    expectedStatus: 'ok',
  },
  {
    name: 'api-readiness',
    url: 'https://ai-sport-api.vercel.app/health/ready',
    expectedStatus: 'ready',
  },
];

const percentile = (values, ratio) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * ratio) - 1] ?? 0;
};

const round = (value) => Math.round(value * 100) / 100;

const measure = async ({ name, url, expectedStatus }) => {
  const durations = [];
  const failures = [];

  for (let index = 0; index < requestCount; index += 1) {
    const startedAt = performance.now();
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { 'user-agent': 'alcide-rncp-performance-check/1.0' },
      });
      const payload = await response.json();
      durations.push(performance.now() - startedAt);
      if (!response.ok || payload.status !== expectedStatus) {
        failures.push({ index: index + 1, httpStatus: response.status, status: payload.status });
      }
    } catch (error) {
      durations.push(performance.now() - startedAt);
      failures.push({
        index: index + 1,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const p95Ms = percentile(durations, 0.95);
  return {
    name,
    url,
    requests: requestCount,
    successes: requestCount - failures.length,
    failures,
    minMs: round(Math.min(...durations)),
    medianMs: round(percentile(durations, 0.5)),
    p95Ms: round(p95Ms),
    maxMs: round(Math.max(...durations)),
    averageMs: round(durations.reduce((sum, value) => sum + value, 0) / durations.length),
    objective: `100 % HTTP/JSON valides et p95 <= ${maxP95Ms} ms`,
    objectiveMet: failures.length === 0 && p95Ms <= maxP95Ms,
  };
};

const startedAt = new Date().toISOString();
const results = [];
for (const endpoint of endpoints) {
  results.push(await measure(endpoint));
}

const report = {
  startedAt,
  finishedAt: new Date().toISOString(),
  method: 'requêtes séquentielles depuis le poste candidat, sans préchauffage ni authentification',
  results,
};

console.log(JSON.stringify(report, null, 2));

if (results.some((result) => !result.objectiveMet)) {
  process.exitCode = 1;
}
