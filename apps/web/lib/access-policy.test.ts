import { describe, expect, it, vi } from 'vitest';
import { hasProductionAccess, isProductionAccessRestricted } from './access-policy';

vi.mock('server-only', () => ({}));

describe('politique de production fermee', () => {
  const closed = {
    PRODUCTION_ACCESS_MODE: 'admin-only',
    ADMIN_EMAILS: ' Admin@example.test, second@example.test ',
  };

  it('conserve le fonctionnement public par defaut', () => {
    expect(isProductionAccessRestricted({})).toBe(false);
    expect(hasProductionAccess({}, {})).toBe(true);
    expect(
      hasProductionAccess({ email: 'any@example.test' }, { PRODUCTION_ACCESS_MODE: 'public' }),
    ).toBe(true);
  });

  it('autorise seulement une adresse exacte de la liste avec preuve stricte', () => {
    expect(
      hasProductionAccess({ email: 'admin@EXAMPLE.test', googleEmailVerified: true }, closed),
    ).toBe(true);
    for (const email of ['other@example.test', 'admin+alias@example.test', '', undefined]) {
      expect(hasProductionAccess({ email, googleEmailVerified: true }, closed)).toBe(false);
    }
    for (const googleEmailVerified of [false, undefined, null, 'true', 1]) {
      expect(
        hasProductionAccess({ email: 'admin@example.test', googleEmailVerified }, closed),
      ).toBe(false);
    }
  });

  it('reste ferme si la liste est vide ou le mode est inconnu', () => {
    const identity = { email: 'admin@example.test', googleEmailVerified: true };
    expect(hasProductionAccess(identity, { PRODUCTION_ACCESS_MODE: 'admin-only' })).toBe(false);
    expect(hasProductionAccess(identity, { ...closed, PRODUCTION_ACCESS_MODE: 'typo' })).toBe(
      false,
    );
    expect(isProductionAccessRestricted({ PRODUCTION_ACCESS_MODE: 'typo' })).toBe(true);
  });
});
