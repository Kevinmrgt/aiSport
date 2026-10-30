/** A fresh script nonce is passed to Next's renderer by middleware. */
export function contentSecurityPolicy(nonce: string, development: boolean, apiUrl: string): string {
  const apiOrigin = new URL(apiUrl).origin;
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    // Existing components use inline style attributes; script execution stays nonce-only.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    `connect-src 'self' ${apiOrigin}${development ? ' ws: wss:' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com",
    "frame-ancestors 'none'",
    ...(development ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}
