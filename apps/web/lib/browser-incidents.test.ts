import { describe, expect, it, vi } from 'vitest';
import { createIncidentReporter } from './browser-incidents';

describe('collecte des incidents navigateur', () => {
  it('ne transporte que le type fixe et une route sans données ni identifiants', () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const report = createIncidentReporter(send);
    report('unhandled_error', '/programs/private-id/sessions/private-session?token=secret#private');
    report('unhandled_rejection', '/unknown/private-personal-data');
    expect(send.mock.calls).toEqual([
      [{ kind: 'unhandled_error', path: '/programs/:id/sessions/:sessionId' }],
      [{ kind: 'unhandled_rejection', path: '/unknown' }],
    ]);
  });
  it('déduplique les remontages et les rafales puis libère le budget après une minute', () => {
    let time = 1_000;
    const send = vi.fn().mockResolvedValue(undefined);
    const report = createIncidentReporter(send, () => time);
    report('react_boundary', '/dashboard');
    report('react_boundary', '/dashboard');
    report('react_boundary', '/dashboard?private=value');
    expect(send).toHaveBeenCalledTimes(1);
    for (const route of [
      '/generate',
      '/workouts',
      '/programs',
      '/settings',
      '/admin',
      '/login',
      '/',
      '/tarifs',
    ])
      report('react_boundary', route);
    expect(send).toHaveBeenCalledTimes(8);
    time += 60_000;
    report('react_boundary', '/dashboard');
    expect(send).toHaveBeenCalledTimes(9);
  });
  it('avale les échecs synchrones et asynchrones sans réessai ni boucle', async () => {
    const send = vi.fn().mockRejectedValue(new Error('sensitive'));
    const report = createIncidentReporter(send);
    expect(() => report('unhandled_error', '/dashboard')).not.toThrow();
    await Promise.resolve();
    report('unhandled_error', '/dashboard');
    expect(send).toHaveBeenCalledOnce();
    const throwing = createIncidentReporter(() => {
      throw new Error('sensitive');
    });
    expect(() => throwing('unhandled_error', '/dashboard')).not.toThrow();
  });
});
