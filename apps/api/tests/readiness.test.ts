import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const client = vi.hoisted(() => ({
  connect: vi.fn(),
  query: vi.fn(),
  end: vi.fn(),
  options: vi.fn(),
}));
vi.mock('pg', () => ({
  Client: class {
    constructor(options: unknown) {
      client.options(options);
    }
    connect = client.connect;
    query = client.query;
    end = client.end;
  },
}));

import {
  checkReadiness,
  READINESS_MIGRATION_COUNT,
  READINESS_MIGRATION_TIMESTAMP,
} from '../src/lib/readiness.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('readiness dependency bounds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('DATABASE_URL', 'postgresql://synthetic:synthetic@localhost/health_test');
    vi.stubEnv('OPENAI_API_KEY', 'synthetic-key');
    client.connect.mockResolvedValue(undefined);
    client.end.mockResolvedValue(undefined);
    client.query.mockResolvedValue({ rows: [{ schema_ready: true, migrations_ready: true }] });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('requires the schema and config, and always closes its bounded connection', async () => {
    expect(await checkReadiness()).toEqual({
      ready: true,
      checks: { database: 'ok', schema: 'ok', aiConfiguration: 'ok' },
    });
    expect(client.end).toHaveBeenCalledOnce();
    expect(client.options).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionTimeoutMillis: 3_000,
        statement_timeout: 3_000,
        query_timeout: 3_500,
      }),
    );
    const calls = client.query.mock.calls as Array<[string, unknown[]]>;
    expect(calls[0]?.[1][0]).toEqual(
      expect.arrayContaining([
        'public.generation_control',
        'public.generation_operations',
        'public.generation_daily_budgets',
        'public.generation_usage_events',
        'public.account_revocations',
        'public.session_log_operations',
        'drizzle.__drizzle_migrations',
      ]),
    );
    client.query.mockResolvedValueOnce({ rows: [{ schema_ready: false }] });
    expect((await checkReadiness()).ready).toBe(false);
  });

  it('closes a failed query without exposing driver details', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    client.query.mockRejectedValueOnce(new Error('synthetic-password-and-user-row'));
    expect((await checkReadiness()).checks.database).toBe('unavailable');
    expect(client.end).toHaveBeenCalledOnce();
    expect(JSON.stringify(log.mock.calls)).not.toContain('synthetic-password-and-user-row');
  });

  it('reports missing AI config even when PostgreSQL succeeds', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    expect(await checkReadiness()).toMatchObject({
      ready: false,
      checks: { database: 'ok', aiConfiguration: 'missing' },
    });
  });

  it('shares one connection among twenty concurrent probes until cleanup has finished', async () => {
    const query = deferred<{ rows: Array<{ schema_ready: boolean }> }>();
    const cleanup = deferred<undefined>();
    client.query.mockImplementationOnce(() => query.promise);
    client.end.mockImplementationOnce(() => cleanup.promise);
    const requests = Array.from({ length: 20 }, () => checkReadiness());
    try {
      await vi.waitFor(() => expect(client.query).toHaveBeenCalledOnce());
      expect(client.options).toHaveBeenCalledOnce();
      expect(client.connect).toHaveBeenCalledOnce();
      query.resolve({ rows: [{ schema_ready: true }] });
      await vi.waitFor(() => expect(client.end).toHaveBeenCalledOnce());
      requests.push(checkReadiness());
      expect(client.options).toHaveBeenCalledOnce();
    } finally {
      query.resolve({ rows: [{ schema_ready: true }] });
      cleanup.resolve(undefined);
      const results = await Promise.all(requests);
      expect(results).toHaveLength(21);
      expect(results.every((result) => result.ready)).toBe(true);
    }
    expect(client.end).toHaveBeenCalledOnce();
    await checkReadiness();
    expect(client.options).toHaveBeenCalledTimes(2);
    expect(client.end).toHaveBeenCalledTimes(2);
  });

  it('does not cache a shared failure and recovers with a fresh connection', async () => {
    const query = deferred<{ rows: Array<{ schema_ready: boolean }> }>();
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    client.query.mockImplementationOnce(() => query.promise);
    const requests = Array.from({ length: 20 }, () => checkReadiness());
    try {
      await vi.waitFor(() => expect(client.connect).toHaveBeenCalledOnce());
    } finally {
      query.reject(new Error('synthetic-secret-driver-message'));
    }
    const failed = await Promise.all(requests);
    expect(
      failed.every((result) => !result.ready && result.checks.database === 'unavailable'),
    ).toBe(true);
    expect(client.end).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledOnce();
    expect(JSON.stringify(log.mock.calls)).not.toContain('synthetic-secret-driver-message');
    expect((await checkReadiness()).ready).toBe(true);
    expect(client.options).toHaveBeenCalledTimes(2);
    expect(client.end).toHaveBeenCalledTimes(2);
  });

  it('does not memoize AI configuration with the shared database probe', async () => {
    const query = deferred<{ rows: Array<{ schema_ready: boolean }> }>();
    client.query.mockImplementationOnce(() => query.promise);
    const withKey = checkReadiness();
    vi.stubEnv('OPENAI_API_KEY', '');
    const withoutKey = checkReadiness();
    query.resolve({ rows: [{ schema_ready: true }] });
    expect((await withKey).checks.aiConfiguration).toBe('ok');
    expect((await withoutKey).checks.aiConfiguration).toBe('missing');
    expect(client.options).toHaveBeenCalledOnce();
  });

  it('closes after a failed connection and performs a new probe after recovery', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    client.connect.mockRejectedValueOnce(new Error('synthetic-connect-error'));
    expect((await checkReadiness()).checks.database).toBe('unavailable');
    expect(client.end).toHaveBeenCalledOnce();
    expect((await checkReadiness()).ready).toBe(true);
    expect(client.end).toHaveBeenCalledTimes(2);
  });

  it('refuses an unapplied migration even when all tables exist', async () => {
    client.query.mockResolvedValueOnce({ rows: [{ schema_ready: true }] });
    client.query.mockResolvedValueOnce({ rows: [{ migrations_ready: false }] });
    expect(await checkReadiness()).toMatchObject({
      ready: false,
      checks: { database: 'ok', schema: 'missing' },
    });
    expect(client.query.mock.calls[1]?.[1]).toEqual([
      READINESS_MIGRATION_TIMESTAMP,
      READINESS_MIGRATION_COUNT,
    ]);
    expect(client.end).toHaveBeenCalledOnce();
  });

  it('keeps its expected migration version synchronized with the committed journal', () => {
    const journal = JSON.parse(
      readFileSync(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8'),
    ) as {
      entries: Array<{ when: number }>;
    };
    expect(READINESS_MIGRATION_COUNT).toBe(journal.entries.length);
    expect(READINESS_MIGRATION_TIMESTAMP).toBe(
      Math.max(...journal.entries.map((entry) => entry.when)),
    );
  });
});
