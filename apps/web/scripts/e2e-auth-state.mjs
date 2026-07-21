export const authSessionCookieNames = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
];

export function filterStateForOrigin(state, baseURL) {
  const targetURL = new URL(baseURL);
  const targetHostname = targetURL.hostname.toLowerCase();

  return {
    cookies: (state.cookies ?? []).filter(
      (cookie) => cookie.domain.replace(/^\./, '').toLowerCase() === targetHostname,
    ),
    origins: (state.origins ?? []).filter((origin) => origin.origin === targetURL.origin),
  };
}

export function hasAuthSessionCookie(state) {
  return state.cookies.some((cookie) =>
    authSessionCookieNames.some(
      (name) => cookie.name === name || cookie.name.startsWith(`${name}.`),
    ),
  );
}
