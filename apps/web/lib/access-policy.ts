import 'server-only';

type PolicyEnvironment = Record<string, string | undefined>;

export function isProductionAccessRestricted(env: PolicyEnvironment = process.env): boolean {
  return (env['PRODUCTION_ACCESS_MODE'] ?? 'public') !== 'public';
}

export function hasProductionAccess(
  identity: { email?: unknown; googleEmailVerified?: unknown },
  env: PolicyEnvironment = process.env,
): boolean {
  if (!isProductionAccessRestricted(env)) return true;
  if (env['PRODUCTION_ACCESS_MODE'] !== 'admin-only' || identity.googleEmailVerified !== true)
    return false;
  if (typeof identity.email !== 'string' || !identity.email.trim()) return false;
  const email = identity.email.trim().toLowerCase();
  return (env['ADMIN_EMAILS'] ?? '')
    .split(',')
    .map((allowed) => allowed.trim().toLowerCase())
    .filter(Boolean)
    .includes(email);
}
