// Charger les variables d'environnement en premier (avant tout autre import)
import 'dotenv/config';
import { validateEnv } from './lib/validate-env.js';
// OWASP A05: fail-fast si la configuration est incomplète
validateEnv();

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { requestId } from './lib/logging.js';
import { bodyLimit } from 'hono/body-limit';
import { handleError } from './middleware/error.middleware.js';
import { registerRoutes } from './routes/index.js';

const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3000';

export const app = new Hono();

// OWASP A05: headers de sécurité (secureHeaders)
app.use('*', secureHeaders());

// OWASP A05: CORS restrictif — uniquement le frontend autorisé
app.use(
  '*',
  cors({
    origin: frontendUrl,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'x-session-token',
      'x-internal-secret',
      'x-user-id',
      'x-user-email',
      'x-user-name',
      'x-user-name-encoded',
      'x-request-id',
      'x-auth-issued-at',
      'idempotency-key',
    ],
    credentials: true,
    exposeHeaders: ['x-request-id', 'Retry-After'],
    maxAge: 86_400,
  }),
);

app.use('*', async (ctx, next) => {
  const id = requestId(ctx.req.header('x-request-id'));
  ctx.set('requestId', id);
  ctx.header('x-request-id', id);
  const started = performance.now();
  await next();
  console.info('[Request]', {
    requestId: id,
    method: ctx.req.method,
    statusCode: ctx.res.status,
    durationMs: Math.round(performance.now() - started),
  });
});
// Bound untrusted input before JSON parsing and Zod validation.
app.use(
  '*',
  bodyLimit({
    maxSize: 32 * 1024,
    onError: (ctx) =>
      ctx.json(
        {
          error: 'PAYLOAD_TOO_LARGE',
          message: 'Le contenu de la requete est trop volumineux',
          statusCode: 413,
        },
        413,
      ),
  }),
);

// Handler d'erreurs centralisé — API idiomatique Hono (architecture.md)
app.onError(handleError);

// Enregistrement des routes
registerRoutes(app);

// Route 404 par défaut
app.notFound((ctx) => {
  return ctx.json(
    {
      error: 'NOT_FOUND',
      message: 'Route introuvable',
      statusCode: 404,
    },
    404,
  );
});
