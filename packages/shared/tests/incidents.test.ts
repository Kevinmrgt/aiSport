import { describe, expect, it } from 'vitest';
import {
  AdminIncidentQuerySchema,
  BrowserIncidentInputSchema,
  canonicalBrowserIncidentPath,
  UpdateIncidentStatusSchema,
} from '../src/incidents.js';

describe('incident contracts', () => {
  it('keeps safe templates and removes user data', () => {
    expect(
      canonicalBrowserIncidentPath(
        '/programs/private-token/sessions/private-id?mail=secret@example.com#token',
      ),
    ).toBe('/programs/:id/sessions/:sessionId');
    for (const path of [
      '/secret@example.com',
      'https://evil.test/dashboard',
      '//evil.test/dashboard',
      '/dashboard\\secret',
    ])
      expect(canonicalBrowserIncidentPath(path)).toBe('/unknown');
    expect(canonicalBrowserIncidentPath('/dashboard?token=secret')).toBe('/dashboard');
  });
  it('validates dates, enums, bounded payload and rejects raw error details', () => {
    expect(AdminIncidentQuerySchema.parse({ source: 'ai' })).toEqual({ source: 'ai', page: 1 });
    for (const input of [
      { from: '2026-02-30' },
      { from: '2026-10-31', to: '2026-01-01' },
      { page: 0 },
      { status: 'arbitrary' },
    ])
      expect(AdminIncidentQuerySchema.safeParse(input).success).toBe(false);
    expect(
      BrowserIncidentInputSchema.safeParse({
        kind: 'unhandled_error',
        path: '/dashboard',
        stack: 'private',
      }).success,
    ).toBe(false);
    expect(
      BrowserIncidentInputSchema.safeParse({ kind: 'unhandled_rejection', path: '/dashboard' })
        .success,
    ).toBe(true);
    expect(UpdateIncidentStatusSchema.safeParse({ status: 'resolved' }).success).toBe(true);
    expect(
      UpdateIncidentStatusSchema.safeParse({ status: 'resolved', actor: 'forged' }).success,
    ).toBe(false);
  });
});
