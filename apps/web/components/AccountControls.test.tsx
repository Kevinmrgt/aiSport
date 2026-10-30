import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AccountControls } from './AccountControls';

describe('account rights controls', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  it('offers an export and requires explicit confirmation before erasure', async () => {
    const erase = vi.fn().mockResolvedValue({ error: 'Suppression temporairement indisponible' });
    render(<AccountControls deleteAction={erase} />);
    expect(screen.getByRole('button', { name: 'Télécharger mes données' })).toBeTruthy();
    const button = screen.getByRole('button', { name: 'Supprimer définitivement mon compte' });
    expect(button.hasAttribute('disabled')).toBe(true);
    fireEvent.change(screen.getByLabelText('Saisissez SUPPRIMER pour confirmer'), {
      target: { value: 'SUPPRIMER' },
    });
    fireEvent.click(button);
    await waitFor(() => expect(erase).toHaveBeenCalledWith('SUPPRIMER'));
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Suppression temporairement indisponible',
    );
  });
  it('announces a failed export rather than downloading an error as personal data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    render(<AccountControls deleteAction={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger mes données' }));
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Export indisponible. Réessayez ou contactez le responsable.',
    );
  });
});
