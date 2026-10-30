import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const options = vi.hoisted(() => vi.fn());
vi.mock('pg', () => ({
  Pool: class {
    constructor(configuration: unknown) {
      options(configuration);
    }
  },
}));
vi.mock('drizzle-orm/node-postgres', () => ({ drizzle: vi.fn(() => ({})) }));

describe('application database pool configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    options.mockClear();
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('DATABASE_URL', 'postgresql://user:PRIVATE_LEGACY@localhost/legacy');
    vi.stubEnv('ALCIDE_DATABASE_URL', undefined);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the same dedicated resolver for the application pool', async () => {
    vi.stubEnv(
      'ALCIDE_DATABASE_URL',
      'postgresql://user:PRIVATE_SELECTED@dedicated.invalid/selected?sslmode=require',
    );
    await import('../src/db/index.js');
    expect(options).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString:
          'postgresql://user:PRIVATE_SELECTED@dedicated.invalid/selected?sslmode=verify-full',
        max: 3,
      }),
    );
  });

  it('preserves DATABASE_URL fallback only when no dedicated key exists', async () => {
    await import('../src/db/index.js');
    expect(options).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString: 'postgresql://user:PRIVATE_LEGACY@localhost/legacy',
      }),
    );
  });

  it.each(['', 'PRIVATE_INVALID_OVERRIDE'])(
    'rejects an invalid dedicated override before constructing any pool: %s',
    async (override) => {
      vi.stubEnv('ALCIDE_DATABASE_URL', override);
      await expect(import('../src/db/index.js')).rejects.toThrow(/ALCIDE_DATABASE_URL/);
      expect(options).not.toHaveBeenCalled();
    },
  );
});
