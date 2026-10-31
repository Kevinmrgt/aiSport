import { afterEach, describe, expect, it, vi } from 'vitest';
import { legalInformation } from './legal';

const names = [
  'LEGAL_OPERATOR_NAME',
  'LEGAL_OPERATOR_ADDRESS',
  'LEGAL_OPERATOR_REGISTRATION',
  'LEGAL_PUBLICATION_DIRECTOR',
  'LEGAL_CONTACT_EMAIL',
  'LEGAL_CONTACT_PHONE',
  'LEGAL_HOSTING_NAME',
  'LEGAL_HOSTING_CONTACT',
  'LEGAL_DATA_HOSTING_NAME',
  'LEGAL_DATA_HOSTING_CONTACT',
  'LEGAL_PROCESSING_BASIS',
  'LEGAL_TRANSFERS_NOTICE',
] as const;

function completeConfiguration() {
  for (const name of names) vi.stubEnv(name, 'Synthetic configured value');
  vi.stubEnv('LEGAL_CONTACT_EMAIL', 'operator@example.test');
  vi.stubEnv('LEGAL_CONTACT_PHONE', '+33 (0)1 00 00 00 00');
  vi.stubEnv('LEGAL_VAT_NUMBER', '');
}

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
    completeConfiguration();
    expect(legalInformation().ready).toBe(true);
    vi.stubEnv('LEGAL_CONTACT_EMAIL', 'javascript:invalid');
    expect(legalInformation().ready).toBe(false);
    expect(legalInformation().email).toBeNull();
  });

  it.each(names)('requires %s without treating the optional VAT number as mandatory', (name) => {
    completeConfiguration();
    expect(legalInformation().vatNumber).toBeNull();
    expect(legalInformation().ready).toBe(true);
    vi.stubEnv(name, '  ');
    expect(legalInformation().ready).toBe(false);
  });

  it.each([
    'a@example.test?subject=x',
    'a@example.test\r\nBcc:b@example.test',
    'a%0a@example.test',
  ])('does not build a mailto link from %j', (email) => {
    completeConfiguration();
    vi.stubEnv('LEGAL_CONTACT_EMAIL', email);
    expect(legalInformation().email).toBeNull();
    expect(legalInformation().ready).toBe(false);
  });

  it.each([
    'javascript:alert(1)',
    '+330100000000?x=y',
    '012\r\n3456789',
    '123',
    '1234567890123456',
  ])('does not build a phone link from %j', (phone) => {
    completeConfiguration();
    vi.stubEnv('LEGAL_CONTACT_PHONE', phone);
    expect(legalInformation().phoneHref).toBeNull();
    expect(legalInformation().ready).toBe(false);
  });

  it('normalizes the phone link while preserving its public formatting', () => {
    completeConfiguration();
    vi.stubEnv('LEGAL_CONTACT_PHONE', ' +33 1 00 00 00 00 ');
    expect(legalInformation()).toMatchObject({
      phone: '+33 1 00 00 00 00',
      phoneHref: 'tel:+33100000000',
    });
  });

  it.each(['LEGAL_PROCESSING_BASIS', 'LEGAL_TRANSFERS_NOTICE'])(
    'keeps evaluation status when %s is explicitly unknown',
    (name) => {
      completeConfiguration();
      vi.stubEnv(name, 'Information à confirmer');
      expect(legalInformation().ready).toBe(false);
    },
  );
});
