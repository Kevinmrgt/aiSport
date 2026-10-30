import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Exercise } from '@alcide/shared';
import { Timer } from './Timer';
import type { SessionCompletionPayload, TimerSessionMeta } from './Timer';

describe('Timer - interactions', () => {
  afterEach(cleanup);

  it('conserve l etape courante quand le serveur renvoie les memes donnees', () => {
    const exercises: Exercise[] = [
      { name: 'Pompes', description: 'Trois series', sets: 3, reps: '10', rest_seconds: 0 },
      { name: 'Squats', description: 'Deux series', sets: 2, reps: '10', rest_seconds: 0 },
    ];
    const { rerender } = render(<Timer exercises={exercises} />);
    fireEvent.click(screen.getByRole('button', { name: /terminer l'exercice/i }));
    expect(screen.getByRole('heading', { name: 'Squats' })).toBeTruthy();

    rerender(<Timer exercises={structuredClone(exercises)} />);

    expect(screen.getByRole('heading', { name: 'Squats' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Pompes' })).toBeNull();
  });

  it('conserve le formulaire et sa confirmation pendant une revalidation serveur', async () => {
    const exercises: Exercise[] = [
      { name: 'Pompes', description: 'Trois series', sets: 3, reps: '10', rest_seconds: 0 },
    ];
    const sessionMeta: TimerSessionMeta = {
      sourceType: 'workout',
      workoutId: '22222222-2222-4222-8222-222222222222',
      title: 'Seance privee',
      sport: 'renforcement',
      difficulty: 'beginner',
      plannedDurationMinutes: 15,
    };
    let resolveSave!: () => void;
    const completeAction = vi.fn<(payload: SessionCompletionPayload) => Promise<void>>(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );
    const { rerender } = render(
      <Timer exercises={exercises} sessionMeta={sessionMeta} completeAction={completeAction} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /terminer l'exercice/i }));
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Bonne technique' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le retour' }));
    expect(completeAction).toHaveBeenCalledOnce();

    const refreshed = () => (
      <Timer
        exercises={structuredClone(exercises)}
        sessionMeta={structuredClone(sessionMeta)}
        completeAction={(payload) => completeAction(payload)}
      />
    );
    rerender(refreshed());
    expect(screen.getByText('Seance terminee')).toBeTruthy();
    expect(screen.getByLabelText<HTMLTextAreaElement>('Notes').value).toBe('Bonne technique');

    await act(async () => {
      resolveSave();
      await Promise.resolve();
    });
    expect(screen.getByText('Retour enregistre.')).toBeTruthy();
    rerender(refreshed());
    expect(screen.getByText('Retour enregistre.')).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Sauvegarde' }).disabled).toBe(
      true,
    );
    expect(completeAction).toHaveBeenCalledOnce();
  });

  it('reinitialise le minuteur quand le contenu de la seance change reellement', () => {
    const exercise: Exercise = {
      name: 'Pompes',
      description: 'Trois series',
      sets: 3,
      reps: '10',
      rest_seconds: 0,
    };
    const { rerender } = render(<Timer exercises={[exercise]} />);
    fireEvent.click(screen.getByRole('button', { name: /terminer l'exercice/i }));
    expect(screen.getByText('Seance terminee')).toBeTruthy();

    rerender(<Timer exercises={[{ ...exercise, name: 'Squats' }]} />);

    expect(screen.getByRole('heading', { name: 'Squats' })).toBeTruthy();
    expect(screen.queryByText('Seance terminee')).toBeNull();
  });

  it('ne conserve pas le retour termine pour une autre identite de seance', () => {
    const exercises: Exercise[] = [
      { name: 'Pompes', description: 'Trois series', sets: 3, reps: '10', rest_seconds: 0 },
    ];
    const sessionMeta: TimerSessionMeta = {
      sourceType: 'workout',
      workoutId: '22222222-2222-4222-8222-222222222222',
      title: 'Seance privee',
      sport: 'renforcement',
      difficulty: 'beginner',
      plannedDurationMinutes: 15,
    };
    const completeAction = vi.fn();
    const { rerender } = render(
      <Timer exercises={exercises} sessionMeta={sessionMeta} completeAction={completeAction} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /terminer l'exercice/i }));
    expect(screen.getByRole('button', { name: 'Enregistrer le retour' })).toBeTruthy();

    rerender(
      <Timer
        exercises={exercises}
        completeAction={completeAction}
        sessionMeta={{ ...sessionMeta, workoutId: '33333333-3333-4333-8333-333333333333' }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Pompes' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Enregistrer le retour' })).toBeNull();
  });

  it('termine explicitement un exercice sans duree', () => {
    const exercises: Exercise[] = [
      {
        name: 'Pompes',
        description: 'Trois series',
        sets: 3,
        reps: '10',
        rest_seconds: 0,
      },
    ];
    render(<Timer exercises={exercises} />);

    expect(screen.getByText('Pompes')).toBeTruthy();
    expect(screen.getByText('manuel')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /terminer l'exercice/i }));
    expect(screen.getByText('Seance terminee')).toBeTruthy();
  });

  it('demarre un chrono en plein ecran puis le quitte avec Echap', () => {
    const exercises: Exercise[] = [
      {
        name: 'Sprint',
        description: 'Vite',
        duration_seconds: 30,
        rest_seconds: 0,
      },
    ];
    render(<Timer exercises={exercises} />);

    const startButton = screen.getByRole('button', { name: 'Demarrer' });
    startButton.focus();
    fireEvent.click(startButton);
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Pause' }));
  });

  it('restaure le focus apres une sortie plein ecran native', async () => {
    const exercises: Exercise[] = [
      {
        name: 'Sprint',
        description: 'Vite',
        duration_seconds: 30,
        rest_seconds: 0,
      },
    ];
    const fullscreenElementDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'fullscreenElement',
    );
    const requestFullscreenDescriptor = Object.getOwnPropertyDescriptor(
      document.documentElement,
      'requestFullscreen',
    );
    let fullscreenElement: Element | null = null;

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenElement,
    });
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: () => {
        fullscreenElement = document.documentElement;
        document.dispatchEvent(new Event('fullscreenchange'));
        return Promise.resolve();
      },
    });

    try {
      render(<Timer exercises={exercises} />);
      const startButton = screen.getByRole('button', { name: 'Demarrer' });
      startButton.focus();

      await act(async () => {
        fireEvent.click(startButton);
        await Promise.resolve();
      });
      expect(screen.getByRole('dialog')).toBeTruthy();

      act(() => {
        fullscreenElement = null;
        document.dispatchEvent(new Event('fullscreenchange'));
      });

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Pause' }));
    } finally {
      if (fullscreenElementDescriptor) {
        Object.defineProperty(document, 'fullscreenElement', fullscreenElementDescriptor);
      } else {
        Reflect.deleteProperty(document, 'fullscreenElement');
      }
      if (requestFullscreenDescriptor) {
        Object.defineProperty(
          document.documentElement,
          'requestFullscreen',
          requestFullscreenDescriptor,
        );
      } else {
        Reflect.deleteProperty(document.documentElement, 'requestFullscreen');
      }
    }
  });
});
