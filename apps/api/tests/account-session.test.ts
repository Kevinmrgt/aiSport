import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  assertGoogleSessionActive,
  identityHash,
  parseSessionIssuedAt,
  SESSION_CLOCK_SKEW_MS,
} from '../src/services/account-session.service.js';

describe('privacy session assertions', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('requires a bounded integer issue date without retaining caller contents', () => {
    const now = Date.now();
    expect(parseSessionIssuedAt(String(now), now)).toBe(now);
    expect(() => parseSessionIssuedAt(undefined, now)).toThrow();
    expect(() => parseSessionIssuedAt('PRIVATE_SENTINEL', now)).toThrow(/Reconnectez/);
    expect(() => parseSessionIssuedAt(String(now + 60_000), now)).toThrow();
    expect(() => parseSessionIssuedAt(String(now - 32 * 86_400_000), now)).toThrow();
  });
  it('stores a stable keyed pseudonym instead of email or provider subject', () => {
    vi.stubEnv('PRIVACY_REVOCATION_SECRET', 'private-synthetic-test-secret');
    expect(identityHash('google-owner')).toMatch(/^[a-f0-9]{64}$/);
    expect(identityHash('google-owner')).not.toContain('google-owner');
    expect(identityHash('google-owner')).not.toBe(identityHash('google-other'));
  });
  it.each([0, 1, 1000, 30_000])(
    'revokes a pre-erasure cookie even with a tolerated clock offset of %i ms',
    async (offset) => {
      vi.stubEnv('PRIVACY_REVOCATION_SECRET', 'private-synthetic-test-secret');
      const now = Date.now();
      const executor = {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([{ revokedAt: new Date(now) }]),
            }),
          }),
        }),
      };
      const issuedAt = parseSessionIssuedAt(String(now + offset), now);
      await expect(
        assertGoogleSessionActive('google-owner', issuedAt, executor as never),
      ).rejects.toMatchObject({ statusCode: 401 });
      await expect(
        assertGoogleSessionActive(
          'google-owner',
          now + SESSION_CLOCK_SKEW_MS + 1,
          executor as never,
        ),
      ).resolves.toBeUndefined();
    },
  );
});
