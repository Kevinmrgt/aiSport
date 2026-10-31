function configured(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function legalInformation() {
  const operator = configured('LEGAL_OPERATOR_NAME');
  const operatorAddress = configured('LEGAL_OPERATOR_ADDRESS');
  const registration = configured('LEGAL_OPERATOR_REGISTRATION');
  const publicationDirector = configured('LEGAL_PUBLICATION_DIRECTOR');
  const vatNumber = configured('LEGAL_VAT_NUMBER');
  const rawEmail = configured('LEGAL_CONTACT_EMAIL');
  const email =
    rawEmail && /^[A-Za-z0-9.!$'*+_=-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(rawEmail)
      ? rawEmail
      : null;
  const rawPhone = configured('LEGAL_CONTACT_PHONE');
  const phoneDigits = rawPhone?.replace(/[ .()-]/g, '');
  const phone =
    rawPhone && /^[+\d .()-]+$/.test(rawPhone) && /^\+?\d{7,15}$/.test(phoneDigits ?? '')
      ? rawPhone
      : null;
  const host = configured('LEGAL_HOSTING_NAME');
  const hostContact = configured('LEGAL_HOSTING_CONTACT');
  const dataHost = configured('LEGAL_DATA_HOSTING_NAME');
  const dataHostContact = configured('LEGAL_DATA_HOSTING_CONTACT');
  const basis = configured('LEGAL_PROCESSING_BASIS');
  const transfers = configured('LEGAL_TRANSFERS_NOTICE');
  const provisionalNotice =
    /(?:à confirmer|a confirmer|à compléter|a completer|inconnu|unknown|todo|tbd)/i;
  const retention = Number(process.env['RETENTION_INACTIVE_DAYS'] ?? 365);
  return {
    operator,
    operatorAddress,
    registration,
    publicationDirector,
    vatNumber,
    email,
    phone,
    phoneHref: phone ? 'tel:' + phoneDigits : null,
    host,
    hostContact,
    dataHost,
    dataHostContact,
    // Completeness only: this does not certify the legal accuracy of configured notices.
    ready: Boolean(
      operator &&
      operatorAddress &&
      registration &&
      publicationDirector &&
      email &&
      phone &&
      host &&
      hostContact &&
      dataHost &&
      dataHostContact &&
      basis &&
      !provisionalNotice.test(basis) &&
      transfers &&
      !provisionalNotice.test(transfers),
    ),
    retentionDays:
      Number.isInteger(retention) && retention >= 30 && retention <= 3650 ? retention : 365,
    basis,
    transfers,
  };
}
