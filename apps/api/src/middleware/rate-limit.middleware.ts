import type { Context, Next } from 'hono';
import { AppError } from '../types/app-error.js';

// OWASP A04 - Insecure Design : limiter les appels IA par utilisateur
// Fenêtre glissante par userId. Store in-memory — remplacer par Redis en production.

interface RateWindow {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateWindow>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 5;   // 5 générations par minute par utilisateur

export async function rateLimitMiddleware(ctx: Context, next: Next): Promise<void> {
  const { userId } = ctx.get('auth');
  const now = Date.now();

  let window = store.get(userId);

  // Réinitialiser la fenêtre si elle est expirée
  if (!window || window.resetAt < now) {
    window = { count: 0, resetAt: now + WINDOW_MS };
    store.set(userId, window);
  }

  window.count++;

  if (window.count > MAX_REQUESTS) {
    const retryAfter = Math.ceil((window.resetAt - now) / 1000);
    // OWASP A09: log des dépassements de limite
    console.warn('[RateLimit] Limite dépassée', {
      userId,
      count: window.count,
      retryAfter,
      timestamp: new Date().toISOString(),
    });
    ctx.header('Retry-After', String(retryAfter));
    throw AppError.tooManyRequests(`Limite de génération dépassée — réessayez dans ${retryAfter}s`);
  }

  await next();
}

// Nettoyage périodique pour éviter les fuites mémoire (fenêtres expirées)
setInterval(
  () => {
    const now = Date.now();
    for (const [key, window] of store.entries()) {
      if (window.resetAt < now) {
        store.delete(key);
      }
    }
  },
  5 * 60_000, // toutes les 5 minutes
);
