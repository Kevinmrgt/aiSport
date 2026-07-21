import type { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { workouts } from '../src/db/schema.js';
import { GenerateWorkoutRequestSchema } from '../src/schemas/workout.input.schema.js';

const allowedOrigin = 'https://frontend.rncp.test';
const hostileOrigin = 'https://hostile.rncp.test';
const serviceSecret = 'rncp-test-service-secret-never-exposed';
const originalEnvironment = {
  DATABASE_URL: process.env['DATABASE_URL'],
  SERVICE_SECRET: process.env['SERVICE_SECRET'],
  FRONTEND_URL: process.env['FRONTEND_URL'],
};

let api: Hono;
let closePool: () => Promise<void>;

beforeAll(async () => {
  process.env['DATABASE_URL'] = 'postgres://rncp:rncp@127.0.0.1:65432/rncp';
  process.env['SERVICE_SECRET'] = serviceSecret;
  process.env['FRONTEND_URL'] = allowedOrigin;

  // The health, CORS and authentication-rejection paths below never connect to PostgreSQL.
  ({ app: api } = await import('../src/app.js'));
  const { pool } = await import('../src/db/index.js');
  closePool = () => pool.end();
});

afterAll(async () => {
  await closePool();
  for (const [name, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

describe('RNCP final security recipes', () => {
  it('CR-042 parameterizes a SQL-like value instead of embedding executable SQL', () => {
    const sqlLikeValue = "'; DROP TABLE workouts; --";

    // OWASP: A03 — compile the exact Drizzle predicate used for user filters without executing it.
    const compiled = new PgDialect().sqlToQuery(eq(workouts.sport, sqlLikeValue));

    expect(compiled.sql).toContain('$1');
    expect(compiled.sql).not.toContain(sqlLikeValue);
    expect(compiled.params).toEqual([sqlLikeValue]);
  });

  it('CR-042 and A04 keep SQL-like text as bounded data and reject oversized input', () => {
    const sqlLikeValue = "'; DROP TABLE workouts; --";
    const valid = GenerateWorkoutRequestSchema.safeParse({
      sport: sqlLikeValue,
      level: 'beginner',
      duration_minutes: 30,
      goals: "Tester que ' OR '1'='1 reste une simple valeur",
      constraints: '<script>alert("rncp")</script>',
    });

    // OWASP: A04 — validation is repeated at the HTTP boundary, independently of the client.
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.sport).toBe(sqlLikeValue);
    }

    const oversized = GenerateWorkoutRequestSchema.safeParse({
      sport: 'course',
      level: 'beginner',
      duration_minutes: 30,
      goals: 'g'.repeat(501),
    });
    expect(oversized.success).toBe(false);
  });

  it('CR-046 refuses CORS authorization to an untrusted origin', async () => {
    // OWASP: A05 — an absent Allow-Origin header makes the browser deny hostile cross-origin access.
    const response = await api.request('/health', {
      method: 'OPTIONS',
      headers: {
        Origin: hostileOrigin,
        'Access-Control-Request-Method': 'GET',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(response.headers.get('vary')).toContain('Origin');
  });

  it('CR-046 authorizes only the configured frontend origin', async () => {
    const response = await api.request('/health', {
      method: 'OPTIONS',
      headers: {
        Origin: allowedOrigin,
        'Access-Control-Request-Method': 'GET',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(allowedOrigin);
    expect(response.headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('A02 and A05 expose hardened API response headers', async () => {
    const response = await api.request('/health');

    expect(response.status).toBe(200);
    expect(response.headers.get('strict-transport-security')).toContain('includeSubDomains');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('cross-origin-resource-policy')).toBe('same-origin');
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
  });

  it('A09 logs a rejected access without disclosing credentials in the response', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await api.request('/workouts', {
      headers: { 'x-internal-secret': 'invalid-controlled-value' },
    });
    const responseText = await response.text();

    // OWASP: A09 — security events remain server-side and the client gets a generic error.
    expect(response.status).toBe(401);
    expect(warn).toHaveBeenCalledWith(
      '[Auth] Secret interne invalide ou manquant',
      expect.objectContaining({ path: '/workouts' }),
    );
    expect(responseText).toContain('UNAUTHORIZED');
    expect(responseText).not.toContain(serviceSecret);
    expect(responseText).not.toContain('invalid-controlled-value');
    expect(responseText).not.toContain('stack');

    warn.mockRestore();
    error.mockRestore();
  });
});
