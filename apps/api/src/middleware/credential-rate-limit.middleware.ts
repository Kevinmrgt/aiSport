import type { Context, Next } from 'hono';
import { AppError } from '../types/app-error.js';

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;

export async function credentialRateLimitMiddleware(ctx: Context, next: Next): Promise<void> {
  const body = await ctx.req.json<unknown>().catch(() => null);
  ctx.set('betaCredentials', body);
  const email =
    typeof body === 'object' && body !== null && 'email' in body && typeof body.email === 'string'
      ? body.email.trim().toLowerCase()
      : 'invalid';
  const now = Date.now();
  const window = attempts.get(email);
  const current = !window || window.resetAt <= now ? { count: 0, resetAt: now + WINDOW_MS } : window;
  current.count += 1;
  attempts.set(email, current);
  if (current.count > MAX_ATTEMPTS) {
    ctx.header('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
    throw AppError.tooManyRequests('Trop de tentatives. Réessayez dans quelques instants.');
  }
  await next();
}

declare module 'hono' {
  interface ContextVariableMap {
    betaCredentials: unknown;
  }
}
