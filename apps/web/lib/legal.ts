function configured(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function legalInformation() {
  const operator = configured('LEGAL_OPERATOR_NAME');
  const rawEmail = configured('LEGAL_CONTACT_EMAIL');
  const email = rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : null;
  const host = configured('LEGAL_HOSTING_NAME');
  const hostContact = configured('LEGAL_HOSTING_CONTACT');
  const retention = Number(process.env['RETENTION_INACTIVE_DAYS'] ?? 365);
  return {
    operator,
    email,
    host,
    hostContact,
    ready: Boolean(
      operator &&
      email &&
      host &&
      hostContact &&
      configured('LEGAL_PROCESSING_BASIS') &&
      configured('LEGAL_TRANSFERS_NOTICE'),
    ),
    retentionDays:
      Number.isInteger(retention) && retention >= 30 && retention <= 3650 ? retention : 365,
    basis: configured('LEGAL_PROCESSING_BASIS'),
    transfers: configured('LEGAL_TRANSFERS_NOTICE'),
  };
}
