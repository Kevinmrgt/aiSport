import 'server-only';

export function isAdminEmail(
  email: string | null | undefined,
  environment: { ADMIN_EMAILS?: string | undefined } = process.env as unknown as { ADMIN_EMAILS?: string | undefined },
): boolean {
  if (!email) return false;
  const candidate = email.trim().toLowerCase();
  return (environment['ADMIN_EMAILS'] ?? '')
    .split(',')
    .some((configured) => configured.trim().toLowerCase() === candidate && configured.trim() !== '');
}
