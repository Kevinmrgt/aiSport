import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DeleteConfirmationButton } from './DeleteConfirmationButton';

describe('DeleteConfirmationButton', () => {
  afterEach(cleanup);

  it('ouvre un dialogue, place le focus et annule avec Echap', async () => {
    render(
      <DeleteConfirmationButton
        id="workout-1"
        itemLabel="Fractionne"
        itemType="l'entraînement"
        onDelete={vi.fn()}
      />,
    );

    const trigger = screen.getByRole('button', { name: /supprimer l'entraînement/i });
    fireEvent.click(trigger);
    const confirm = screen.getByRole('button', { name: 'Confirmer' });
    await waitFor(() => expect(document.activeElement).toBe(confirm));
    expect(screen.getByRole('group').getAttribute('aria-modal')).toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('group')).toBeNull());
    expect(document.activeElement?.getAttribute('aria-label')).toContain("Supprimer l'entraînement");
  });

  it('execute la suppression confirmee', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <DeleteConfirmationButton
        id="program-1"
        itemLabel="Cycle course"
        itemType="le programme"
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /supprimer le programme/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer' }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('program-1'));
    await waitFor(() => expect(screen.queryByRole('group')).toBeNull());
  });

  it('conserve le dialogue et annonce une erreur de suppression', async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error('Suppression refusee'));
    render(
      <DeleteConfirmationButton
        id="workout-2"
        itemLabel="Tempo"
        itemType="l'entraînement"
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /supprimer l'entraînement/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Suppression refusee');
    expect(screen.getByRole('group')).toBeTruthy();
  });
});
