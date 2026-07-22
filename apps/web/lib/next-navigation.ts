export function isNextRedirectError(error: unknown): error is Error & { digest: string } {
  if (!(error instanceof Error)) return false;

  const digest = 'digest' in error ? error.digest : undefined;
  return (
    typeof digest === 'string' && /^NEXT_REDIRECT;(?:push|replace);/.test(digest)
  );
}
