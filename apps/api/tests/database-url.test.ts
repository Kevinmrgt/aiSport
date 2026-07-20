import { describe, expect, it } from 'vitest';
import { normalizeDatabaseUrl } from '../src/db/database-url.js';

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
    const databaseUrl =
      'postgresql://user:secret@database.example:5432/alcide?sslmode=verify-full';

    expect(normalizeDatabaseUrl(databaseUrl)).toBe(databaseUrl);
  });

  it('conserve une URL locale sans paramètre TLS', () => {
    const databaseUrl = 'postgresql://alcide:alcide_dev@localhost:5432/alcide';

    expect(normalizeDatabaseUrl(databaseUrl)).toBe(databaseUrl);
  });
});
