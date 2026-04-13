import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { handleError } from '../src/middleware/error.middleware.js';
import { AppError } from '../src/types/app-error.js';

// Tests du handler d'erreurs centralisé (OWASP A09)
function createApp(throwError: Error) {
  const app = new Hono();
  app.onError(handleError);
  app.get('/test', () => {
    throw throwError;
  });
  return app;
}

describe('handleError', () => {
  it('retourne le statusCode et le code d\'une AppError', async () => {
    // notFound('Ressource') → message = 'Ressource introuvable'
    const app = createApp(AppError.notFound('Ressource'));
    const res = await app.fetch(new Request('http://localhost/test'));

    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string; message: string; statusCode: number };
    expect(body.error).toBe('NOT_FOUND');
    expect(body.message).toBe('Ressource introuvable');
    expect(body.statusCode).toBe(404);
  });

  it('retourne 400 pour AppError.badRequest', async () => {
    const app = createApp(AppError.badRequest('Données invalides'));
    const res = await app.fetch(new Request('http://localhost/test'));

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('BAD_REQUEST');
  });

  it('retourne 500 INTERNAL_ERROR pour les erreurs inattendues', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const app = createApp(new Error('Erreur système inattendue'));

    const res = await app.fetch(new Request('http://localhost/test'));

    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('INTERNAL_ERROR');
    // OWASP A09: ne pas exposer les détails internes
    expect(body.message).toBe('Une erreur inattendue est survenue');
    consoleSpy.mockRestore();
  });

  it('loggue les AppError via console.error (OWASP A09)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const app = createApp(AppError.unauthorized('Non autorisé'));

    await app.fetch(new Request('http://localhost/test'));

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[AppError]'),
      expect.any(Object),
    );
    consoleSpy.mockRestore();
  });
});
