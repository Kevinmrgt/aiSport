import { Hono } from 'hono';
import { checkReadiness } from '../lib/readiness.js';

const healthRouter = new Hono();
const appVersion =
  process.env['APP_VERSION'] ?? process.env['npm_package_version'] ?? '0.13.0-rc.8';

function releaseRevision(): string | null {
  const candidate = process.env['APP_REVISION'] ?? process.env['VERCEL_GIT_COMMIT_SHA'];
  return candidate && /^[a-f0-9]{40}$/i.test(candidate) ? candidate.toLowerCase() : null;
}

healthRouter.get('/', (ctx) => {
  ctx.header('Cache-Control', 'no-store, max-age=0');

  return ctx.json({
    status: 'ok',
    service: 'alcide-api',
    timestamp: new Date().toISOString(),
    version: appVersion,
    revision: releaseRevision(),
  });
});

healthRouter.get('/ready', async (ctx) => {
  ctx.header('Cache-Control', 'no-store, max-age=0');
  const readiness = await checkReadiness();

  return ctx.json(
    {
      status: readiness.ready ? 'ready' : 'not_ready',
      service: 'alcide-api',
      timestamp: new Date().toISOString(),
      version: appVersion,
      revision: releaseRevision(),
      checks: readiness.checks,
    },
    readiness.ready ? 200 : 503,
  );
});

export { healthRouter };
