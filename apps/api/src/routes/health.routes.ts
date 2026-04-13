import { Hono } from 'hono';

const healthRouter = new Hono();

healthRouter.get('/', (ctx) => {
  return ctx.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env['npm_package_version'] ?? '0.1.0',
  });
});

export { healthRouter };
