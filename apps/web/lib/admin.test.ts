import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { isAdminEmail } from './admin';

describe('isAdminEmail', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('refuse une adresse absente ou non configurée', () => {
    expect(isAdminEmail(null, { ADMIN_EMAILS: 'admin@example.com' })).toBe(false);
    expect(isAdminEmail(undefined, { ADMIN_EMAILS: 'admin@example.com' })).toBe(false);
    expect(isAdminEmail('visitor@example.com', { ADMIN_EMAILS: 'admin@example.com' })).toBe(false);
    expect(isAdminEmail('admin@example.com', {})).toBe(false);
  });

  it('compare les adresses sans tenir compte des espaces ou de la casse', () => {
    expect(isAdminEmail(' ADMIN@EXAMPLE.COM ', { ADMIN_EMAILS: ' , admin@example.com ,other@example.com ' })).toBe(true);
  });
});
