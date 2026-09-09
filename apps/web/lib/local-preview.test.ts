import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { createJuryPasswordHash } from './jury-auth';
import { getLocalPreviewCredentials, isLocalPreview } from './local-preview';

const password = 'temporary-preview-test-password';
const environment = {
  ALCIDE_LOCAL_PREVIEW: 'true',
  AUTH_URL: 'http://127.0.0.1:3100',
  API_URL: 'http://127.0.0.1:3101',
  NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3101',
  ALCIDE_PREVIEW_PASSWORD: password,
  JURY_ACCESS_ENABLED: 'true',
  JURY_ACCESS_USER_ID: 'jury-ui-preview',
  JURY_ACCESS_EMAIL: 'ui-preview@alcide.invalid',
  JURY_ACCESS_IDENTIFIER: 'test-preview',
  JURY_ACCESS_PASSWORD_HASH: createJuryPasswordHash(password),
  JURY_ACCESS_NAME: 'Test',
  JURY_ACCESS_EXPIRES_AT: new Date(Date.now() + 3600000).toISOString(),
  JURY_ACCESS_SESSION_VERSION: 'preview-test-version',
};

describe('accès de démonstration strictement local', () => {
  it('reste désactivé sans option explicite et avec des URLs normales', () => {
    expect(isLocalPreview({})).toBe(false);
    expect(isLocalPreview({ ...environment, ALCIDE_LOCAL_PREVIEW: 'false' })).toBe(false);
    expect(isLocalPreview({ ...environment, AUTH_URL: 'https://alcide.example' })).toBe(false);
  });

  it('refuse une API réelle, une autre origine et un compte ordinaire', () => {
    for (const override of [
      { API_URL: 'https://api.alcide.example' },
      { NEXT_PUBLIC_API_URL: 'https://api.alcide.example' },
      { AUTH_URL: 'http://127.0.0.1:3100.evil.example' },
      { JURY_ACCESS_USER_ID: 'user-real' },
      { JURY_ACCESS_EMAIL: 'user@example.com' },
    ])
      expect(getLocalPreviewCredentials({ ...environment, ...override })).toBeNull();
  });

  it('utilise les credentials temporaires du jury sans contourner leur vérification', () => {
    expect(getLocalPreviewCredentials(environment)).toEqual({
      identifier: 'test-preview',
      password,
    });
  });

  it('refuse une session expirée, désactivée ou sans secret temporaire', () => {
    expect(
      getLocalPreviewCredentials({
        ...environment,
        JURY_ACCESS_EXPIRES_AT: '2000-01-01T00:00:00Z',
      }),
    ).toBeNull();
    expect(getLocalPreviewCredentials({ ...environment, JURY_ACCESS_ENABLED: 'false' })).toBeNull();
    expect(getLocalPreviewCredentials({ ...environment, ALCIDE_PREVIEW_PASSWORD: '' })).toBeNull();
  });
});
