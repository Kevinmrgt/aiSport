import { Hono } from 'hono';

const healthRouter = new Hono();
const appVersion =
  process.env['APP_VERSION'] ?? process.env['npm_package_version'] ?? '0.12.0';

healthRouter.get('/', (ctx) => {
  ctx.header('Cache-Control', 'no-store, max-age=0');

  return ctx.json({
    status: 'ok',
    service: 'alcide-api',
    timestamp: new Date().toISOString(),
    version: appVersion,
  });
});

export { healthRouter };
