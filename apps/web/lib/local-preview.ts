import 'server-only';
import { isJuryAccessAvailable } from './jury-auth';

type PreviewEnvironment = Record<string, string | undefined>;

// This opt-in is only valid for the isolated preview launcher and its fixture API.
export function isLocalPreview(environment: PreviewEnvironment = process.env): boolean {
  return (
    environment['ALCIDE_LOCAL_PREVIEW'] === 'true' &&
    environment['AUTH_URL'] === 'http://127.0.0.1:3100' &&
    environment['API_URL'] === 'http://127.0.0.1:3101' &&
    environment['NEXT_PUBLIC_API_URL'] === 'http://127.0.0.1:3101' &&
    environment['JURY_ACCESS_USER_ID'] === 'jury-ui-preview' &&
    environment['JURY_ACCESS_EMAIL'] === 'ui-preview@alcide.invalid'
  );
}

export function getLocalPreviewCredentials(environment: PreviewEnvironment = process.env) {
  const password = environment['ALCIDE_PREVIEW_PASSWORD'];
  const identifier = environment['JURY_ACCESS_IDENTIFIER'];
  if (
    !isLocalPreview(environment) ||
    !isJuryAccessAvailable(environment) ||
    !identifier ||
    !password ||
    password.length < 20
  ) {
    return null;
  }
  return { identifier, password };
}
