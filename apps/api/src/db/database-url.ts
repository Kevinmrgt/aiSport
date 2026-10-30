const SSL_MODES_WITH_IMPLICIT_FULL_VERIFICATION = new Set([
  'prefer',
  'require',
  'verify-ca',
]);

/**
 * Preserve the strict TLS verification currently applied by node-postgres.
 *
 * pg warns that `prefer`, `require` and `verify-ca` will adopt weaker libpq
 * semantics in its next major version. Rewriting them to `verify-full` makes
 * the intended certificate and hostname verification explicit.
 */
export function normalizeDatabaseUrl(databaseUrl: string): string {
  const parsedUrl = new URL(databaseUrl);
  const sslMode = parsedUrl.searchParams.get('sslmode')?.toLowerCase();

  if (!sslMode || !SSL_MODES_WITH_IMPLICIT_FULL_VERIFICATION.has(sslMode)) {
    return databaseUrl;
  }

  parsedUrl.searchParams.set('sslmode', 'verify-full');
  return parsedUrl.toString();
}

/** Dedicated application configuration wins whenever present; invalid overrides never fall back. */
export function resolveDatabaseUrl(env: Readonly<Record<string, string | undefined>> = process.env): string {
  const key = Object.prototype.hasOwnProperty.call(env, 'ALCIDE_DATABASE_URL') ? 'ALCIDE_DATABASE_URL' : 'DATABASE_URL';
  const value = env[key];
  if (!value?.trim()) throw new Error(`${key} est requise`);
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error(`${key} invalide`);
  }
  if (!['postgres:', 'postgresql:'].includes(parsedUrl.protocol)) throw new Error(`${key} doit utiliser PostgreSQL`);
  if (!parsedUrl.hostname || !parsedUrl.pathname.slice(1)) throw new Error(`${key} invalide`);
  const normalized = normalizeDatabaseUrl(value);
  parsedUrl = new URL(normalized);
  if (env['NODE_ENV'] === 'production' && !['localhost', '127.0.0.1', '::1', '[::1]'].includes(parsedUrl.hostname) &&
      parsedUrl.searchParams.get('sslmode') !== 'verify-full') {
    throw new Error(`${key} distante exige une verification TLS en production`);
  }
  return normalized;
}
