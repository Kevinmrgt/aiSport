/** Keep onboarding selections while restricting sign-in destinations to this app. */
export function safeReturnTo(value: string | undefined, fallback = '/generate'): string {
  if (
    !value?.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    [...value].some((character) => character.charCodeAt(0) < 32)
  )
    return fallback;
  try {
    const url = new URL(value, 'https://alcide.local');
    if (url.origin !== 'https://alcide.local' || url.pathname === '/login') return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
