import { afterEach, describe, expect, it, vi } from 'vitest';
import { legalInformation } from './legal';

const names = [
  'LEGAL_OPERATOR_NAME',
  'LEGAL_CONTACT_EMAIL',
  'LEGAL_HOSTING_NAME',
  'LEGAL_HOSTING_CONTACT',
  'LEGAL_PROCESSING_BASIS',
  'LEGAL_TRANSFERS_NOTICE',
] as const;

describe('public legal information', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('does not invent missing identity or contact details', () => {
    for (const name of names) vi.stubEnv(name, '');
    const result = legalInformation();
    expect(result.ready).toBe(false);
    expect(result.operator).toBeNull();
    expect(result.email).toBeNull();
  });
  it('requires complete information and rejects an invalid email value', () => {
    for (const name of names) vi.stubEnv(name, 'Synthetic operator value');
    vi.stubEnv('LEGAL_CONTACT_EMAIL', 'operator@example.test');
    expect(legalInformation().ready).toBe(true);
    vi.stubEnv('LEGAL_CONTACT_EMAIL', 'javascript:invalid');
    expect(legalInformation().ready).toBe(false);
    expect(legalInformation().email).toBeNull();
  });
});
