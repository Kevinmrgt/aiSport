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
