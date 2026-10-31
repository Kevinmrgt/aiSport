import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { act, fireEvent, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
const report = vi.hoisted(() => vi.fn());
vi.mock('@/lib/browser-incidents', () => ({ reportBrowserIncident: report }));
import GlobalError from './global-error';

describe('frontière du document racine', () => {
  it('fournit un document français, un réessai et une collecte fixe sans détails internes', () => {
    const reset = vi.fn();
    const root = createRoot(document);
    try {
      act(() => {
        root.render(
          <StrictMode>
            <GlobalError reset={reset} error={new Error('sensitive-message-and-stack')} />
          </StrictMode>,
        );
      });
      const page = within(document.documentElement);
      expect(document.documentElement.lang).toBe('fr');
      expect(page.getByRole('main')).toBeTruthy();
      expect(page.getByRole('heading', { level: 1 }).textContent).toBe('Une erreur est survenue');
      expect(document.body.textContent).not.toContain('sensitive');
      expect(
        report.mock.calls.every((call) => call.length === 1 && call[0] === 'react_boundary'),
      ).toBe(true);
      expect(report).toHaveBeenCalled();
      fireEvent.click(page.getByRole('button', { name: 'Réessayer' }));
      expect(reset).toHaveBeenCalledOnce();
      expect(page.getByRole('link', { name: 'Revenir à l’accueil' }).getAttribute('href')).toBe(
        '/',
      );
    } finally {
      act(() => {
        root.unmount();
      });
    }
  });
});
