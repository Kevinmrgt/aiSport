import type { Context } from 'hono';
import { AppError } from '../types/app-error.js';

// Handler d'erreurs centralisé pour app.onError() — API idiomatique Hono (architecture.md)
// Remplace le pattern middleware try/catch qui ne retourne pas correctement en Hono v4
export function handleError(error: Error, ctx: Context): Response {
  if (error instanceof AppError) {
    // OWASP A09: logger les erreurs applicatives
    console.error(`[AppError] ${error.code}: ${error.message}`, {
      statusCode: error.statusCode,
      details: error.details,
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
  console.error('[UnexpectedError]', error);

  return ctx.json(
    {
      error: 'INTERNAL_ERROR',
      message: 'Une erreur inattendue est survenue',
      statusCode: 500,
    },
    500,
  );
}
