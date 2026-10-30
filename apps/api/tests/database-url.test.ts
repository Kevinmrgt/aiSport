import { describe, expect, it } from 'vitest';
import { normalizeDatabaseUrl, resolveDatabaseUrl } from '../src/db/database-url.js';

describe('normalizeDatabaseUrl', () => {
  it.each(['prefer', 'require', 'verify-ca'])(
    'rend explicite la vérification TLS complète pour sslmode=%s',
    (sslMode) => {
      const result = normalizeDatabaseUrl(
        `postgresql://user:secret@database.example:5432/alcide?sslmode=${sslMode}&channel_binding=require`,
      );

      const parsedResult = new URL(result);
      expect(parsedResult.searchParams.get('sslmode')).toBe('verify-full');
      expect(parsedResult.searchParams.get('channel_binding')).toBe('require');
    },
  );

  it('conserve une URL déjà configurée avec verify-full', () => {
    const databaseUrl = 'postgresql://user:secret@database.example:5432/alcide?sslmode=verify-full';

    expect(normalizeDatabaseUrl(databaseUrl)).toBe(databaseUrl);
  });

  it('conserve une URL locale sans paramètre TLS', () => {
    const databaseUrl = 'postgresql://alcide:alcide_dev@localhost:5432/alcide';

    expect(normalizeDatabaseUrl(databaseUrl)).toBe(databaseUrl);
  });
});

describe('resolveDatabaseUrl', () => {
  const fallback = 'postgresql://user:PRIVATE_FALLBACK@localhost/legacy';
  const dedicated = 'postgresql://user:PRIVATE_OVERRIDE@database.example/selected?sslmode=require';

  it('prioritizes explicit application configuration and falls back only when the key is absent', () => {
    expect(
      new URL(resolveDatabaseUrl({ ALCIDE_DATABASE_URL: dedicated, DATABASE_URL: fallback }))
        .pathname,
    ).toBe('/selected');
    expect(new URL(resolveDatabaseUrl({ ALCIDE_DATABASE_URL: dedicated })).pathname).toBe(
      '/selected',
    );
    expect(resolveDatabaseUrl({ DATABASE_URL: fallback })).toBe(fallback);
    expect(
      new URL(
        resolveDatabaseUrl({
          ALCIDE_DATABASE_URL: dedicated,
          DATABASE_URL: 'PRIVATE_INVALID_FALLBACK',
        }),
      ).pathname,
    ).toBe('/selected');
  });

  it.each([
    '',
    ' ',
    undefined,
    'PRIVATE_INVALID_OVERRIDE',
    'https://user:PRIVATE_OVERRIDE@database.example/selected',
    'postgresql://database.example',
  ])('rejects invalid or empty overrides without using a valid fallback: %s', (override) => {
    expect(() =>
      resolveDatabaseUrl({ ALCIDE_DATABASE_URL: override, DATABASE_URL: fallback }),
    ).toThrow(/ALCIDE_DATABASE_URL/);
    try {
      resolveDatabaseUrl({ ALCIDE_DATABASE_URL: override, DATABASE_URL: fallback });
    } catch (error) {
      expect(String(error)).not.toContain('PRIVATE_');
    }
  });

  it.each(['prefer', 'require', 'verify-ca', 'verify-full'])(
    'preserves full production TLS verification with override sslmode=%s',
    (mode) => {
      const result = resolveDatabaseUrl({
        NODE_ENV: 'production',
        ALCIDE_DATABASE_URL: dedicated.replace('sslmode=require', `sslmode=${mode}`),
      });
      expect(new URL(result).searchParams.get('sslmode')).toBe('verify-full');
    },
  );

  it('refuses a remote production override without TLS even when the fallback has verified TLS', () => {
    for (const suffix of ['', '?sslmode=disable', '?sslmode=allow']) {
      expect(() =>
        resolveDatabaseUrl({
          NODE_ENV: 'production',
          ALCIDE_DATABASE_URL: `postgresql://db.example/selected${suffix}`,
          DATABASE_URL: dedicated,
        }),
      ).toThrow(/ALCIDE_DATABASE_URL.*TLS/);
    }
    expect(
      resolveDatabaseUrl({
        NODE_ENV: 'production',
        ALCIDE_DATABASE_URL: 'postgresql://localhost/selected',
      }),
    ).toBe('postgresql://localhost/selected');
  });
});
