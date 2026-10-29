import type { Context } from 'hono';
import { AppError } from '../types/app-error.js';
import { logFailure } from '../lib/logging.js';

// Handler d'erreurs centralisé pour app.onError() — API idiomatique Hono (architecture.md)
// Remplace le pattern middleware try/catch qui ne retourne pas correctement en Hono v4
export function handleError(error: Error, ctx: Context): Response {
  if (error instanceof AppError) {
    // OWASP A09: logger les erreurs applicatives
    logFailure('[AppError]', {
      requestId: ctx.get('requestId'),
      code: error.code,
      statusCode: error.statusCode,
    });

    return ctx.json(
      {
        error: error.code,
        message: error.message,
        statusCode: error.statusCode,
      },
      error.statusCode as Parameters<typeof ctx.json>[1],
    );
  }

  // Erreur inattendue — ne pas exposer les détails internes (OWASP A09)
  // Stack trace loggée en dev uniquement pour faciliter le debug sans fuiter en prod
  logFailure('[UnexpectedError]', {
    requestId: ctx.get('requestId'),
    code: 'INTERNAL_ERROR',
    statusCode: 500,
    errorName: error.name,
  });

  return ctx.json(
    {
      error: 'INTERNAL_ERROR',
      message: 'Une erreur inattendue est survenue',
      statusCode: 500,
    },
    500,
  );
}
