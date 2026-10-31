import { StrictMode } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
const report = vi.hoisted(() => vi.fn());
vi.mock('@/lib/browser-incidents', () => ({ reportBrowserIncident: report }));
import { IncidentCollector } from './IncidentCollector';

afterEach(() => {
  cleanup();
  report.mockClear();
});
describe('collecteur global', () => {
  it('installe une seule paire d’écouteurs sous StrictMode et les nettoie', () => {
    const mounted = render(
      <StrictMode>
        <IncidentCollector />
      </StrictMode>,
    );
    window.dispatchEvent(
      new ErrorEvent('error', { message: 'private error', error: new Error('private stack') }),
    );
    const rejection = new Event('unhandledrejection');
    Object.defineProperty(rejection, 'reason', {
      get() {
        throw new Error('must never read');
      },
    });
    window.dispatchEvent(rejection);
    expect(report.mock.calls).toEqual([['unhandled_error'], ['unhandled_rejection']]);
    mounted.unmount();
    window.dispatchEvent(new Event('error'));
    expect(report).toHaveBeenCalledTimes(2);
  });
});
