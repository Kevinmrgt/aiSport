export function isAdministratorEmail(email: string): boolean {
  const candidate = email.trim().toLowerCase();
  return (
    candidate.length > 0 &&
    (process.env['ADMIN_EMAILS'] ?? '')
      .split(',')
      .some((value) => value.trim().toLowerCase() === candidate)
  );
}
