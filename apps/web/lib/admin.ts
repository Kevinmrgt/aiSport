import 'server-only';
import { redirect } from 'next/navigation';

export function isAdminEmail(
  email: string | null | undefined,
  environment: { ADMIN_EMAILS?: string | undefined } = process.env as unknown as {
    ADMIN_EMAILS?: string | undefined;
  },
): boolean {
  if (!email) return false;
  const candidate = email.trim().toLowerCase();
  return (environment['ADMIN_EMAILS'] ?? '')
    .split(',')
    .some(
      (configured) => configured.trim().toLowerCase() === candidate && configured.trim() !== '',
    );
}

export function isAdminSession(
  user: { email?: string | null; authMethod?: string } | null | undefined,
): boolean {
  const juryEmail = process.env['JURY_ACCESS_EMAIL']?.trim().toLowerCase();
  return (
    !!user &&
    (!user.authMethod || user.authMethod === 'standard') &&
    !(juryEmail && user.email?.trim().toLowerCase() === juryEmail) &&
    isAdminEmail(user.email)
  );
}

export async function requireAdmin() {
  const { auth } = await import('@/lib/auth');
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!isAdminSession(session.user)) redirect('/dashboard');
  return session.user;
}
