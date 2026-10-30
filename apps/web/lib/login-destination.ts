/** Restrict login redirects to application paths, including encoded URL tricks. */
export function loginDestination(value?: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//'))
    return '/generate';
  try {
    const decoded = decodeURIComponent(value);
    if (
      decoded.includes('\\') ||
      Array.from(decoded).some((character) => character.charCodeAt(0) <= 32) ||
      decoded.startsWith('//')
    )
      return '/generate';
    const url = new URL(value, 'https://www.alcideai.fr');
    if (
      url.origin !== 'https://www.alcideai.fr' ||
      /^\/api(?:\/|$)/.test(url.pathname) ||
      url.pathname === '/login'
    )
      return '/generate';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/generate';
  }
}
