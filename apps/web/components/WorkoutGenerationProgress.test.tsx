import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { WorkoutGenerationProgress } from './WorkoutGenerationProgress';
import { WorkoutForm } from './WorkoutForm';

const quota = { limited: false, limit: null, used: 0, remaining: null } as const;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('attente de génération', () => {
  it('fait évoluer les huit points puis reste en attente sans annoncer une réussite', () => {
    vi.useFakeTimers();
    render(<WorkoutGenerationProgress sport="Boxe anglaise" durationMinutes={60} />);
    expect(document.activeElement).toBe(screen.getByRole('heading'));
    const checkpoints = [
      [0, 'Vos objectifs'],
      [2, 'Votre niveau'],
      [4, 'Votre matériel'],
      [7, 'Les exercices'],
      [10, 'Les efforts'],
      [14, 'Les repos'],
      [19, 'L’enchaînement'],
      [25, 'L’équilibre de la séance'],
    ] as const;
    let previous = 0;
    for (const [second, label] of checkpoints) {
      void act(() => vi.advanceTimersByTime((second - previous) * 1000));
      expect(screen.getByRole('status').textContent).toContain(label);
      previous = second;
    }
    void act(() => vi.advanceTimersByTime(65_000));
    expect(screen.getByRole('status').textContent).toContain('Votre demande est toujours en cours');
    expect(screen.getByRole('timer').textContent).toContain('01:30');
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('arrête le compteur au démontage et repart à zéro à la prochaine génération', () => {
    vi.useFakeTimers();
    const { unmount } = render(<WorkoutGenerationProgress sport="Course" durationMinutes={30} />);
    void act(() => vi.advanceTimersByTime(7000));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    render(<WorkoutGenerationProgress sport="Course" durationMinutes={30} />);
    expect(screen.getByRole('timer').textContent).toContain('00:00');
    expect(screen.getByRole('status').textContent).toContain('Vos objectifs');
  });

  it.each([undefined, { error: 'Réessayez dans un instant' }])(
    'bloque les doubles envois et termine immédiatement à la réponse %j',
    async (result) => {
      vi.useFakeTimers();
      let resolve!: (value: { error?: string } | void) => void;
      const onSubmit = vi.fn(
        () =>
          new Promise<{ error?: string } | void>((done) => {
            resolve = done;
          }),
      );
      render(<WorkoutForm onSubmit={onSubmit} generationQuota={quota} />);
      fireEvent.change(screen.getByLabelText(/sport/i), { target: { value: 'Boxe anglaise' } });
      fireEvent.change(screen.getByLabelText(/objectifs/i), {
        target: { value: 'Travailler mon explosivité' },
      });
      fireEvent.change(screen.getByLabelText(/contraintes et matériel/i), {
        target: { value: 'Sac de frappe' },
      });
      const form = screen.getByRole('form');
      fireEvent.submit(form);
      expect(screen.getByRole('heading', { name: /alcide prépare/i })).toBeTruthy();
      expect(screen.queryByRole('textbox', { name: /sport/i })).toBeNull();
      fireEvent.submit(form);
      expect(onSubmit).toHaveBeenCalledOnce();
      await act(() => {
        resolve(result);
        return Promise.resolve();
      });
      expect(screen.queryByRole('heading', { name: /alcide prépare/i })).toBeNull();
      // jsdom queues selectionchange after focus leaves the removed heading.
      void act(() => vi.advanceTimersByTime(0));
      expect(vi.getTimerCount()).toBe(0);
      expect(screen.getByRole<HTMLInputElement>('textbox', { name: /sport/i }).value).toBe(
        'Boxe anglaise',
      );
      expect(screen.getByLabelText<HTMLTextAreaElement>(/contraintes et matériel/i).value).toBe(
        'Sac de frappe',
      );
      if (result?.error) expect(screen.getByRole('alert').textContent).toContain(result.error);
      else expect(screen.queryByRole('alert')).toBeNull();
    },
  );
});
