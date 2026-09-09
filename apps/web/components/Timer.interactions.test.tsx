import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Exercise } from '@alcide/shared';
import { Timer } from './Timer';

describe('Timer - interactions', () => {
  afterEach(cleanup);

  it('conserve le bilan après un rafraîchissement serveur de props identiques', () => {
    const exercises = [
      { name: 'Pompes', description: 'Trois séries', sets: 3, reps: 10, rest_seconds: 0 },
    ];
    const sessionMeta = {
      sourceType: 'workout' as const,
      workoutId: '10000000-0000-4000-8000-000000000001',
      title: 'Séance',
      sport: 'musculation',
      difficulty: 'beginner' as const,
      plannedDurationMinutes: 20,
    };
    const completeAction = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <Timer exercises={exercises} sessionMeta={sessionMeta} completeAction={completeAction} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /terminer l'exercice/i }));
    fireEvent.change(screen.getByLabelText(/^notes/i), { target: { value: 'À conserver' } });
    rerender(
      <Timer
        exercises={exercises.map((ex) => ({ ...ex }))}
        sessionMeta={{ ...sessionMeta }}
        completeAction={completeAction}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Bilan de séance' })).toBeTruthy();
    expect(screen.getByLabelText<HTMLTextAreaElement>(/^notes/i).value).toBe('À conserver');
    rerender(
      <Timer
        exercises={exercises}
        sessionMeta={{ ...sessionMeta, workoutId: '10000000-0000-4000-8000-000000000002' }}
        completeAction={completeAction}
      />,
    );
    expect(screen.queryByRole('heading', { name: 'Bilan de séance' })).toBeNull();
    expect(screen.getByRole('button', { name: /terminer l'exercice/i })).toBeTruthy();
  });

  it('réinitialise les étapes lorsque le contenu de la séance change', () => {
    const exercise = {
      name: 'Pompes',
      description: 'Trois séries',
      sets: 3,
      reps: 10,
      rest_seconds: 0,
    };
    const { rerender } = render(<Timer exercises={[exercise]} />);
    fireEvent.click(screen.getByRole('button', { name: /terminer l'exercice/i }));
    expect(screen.getByText('Séance terminée')).toBeTruthy();
    rerender(<Timer exercises={[{ ...exercise, name: 'Gainage', duration_seconds: 40 }]} />);
    expect(screen.queryByText('Séance terminée')).toBeNull();
    expect(screen.getByRole('timer', { name: 'Temps restant : 00:40' })).toBeTruthy();
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
    expect(screen.getByText('Mode manuel')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /terminer l'exercice/i }));
    expect(screen.getByText('Séance terminée')).toBeTruthy();
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

    const startButton = screen.getByRole('button', { name: 'Démarrer' });
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
      const startButton = screen.getByRole('button', { name: 'Démarrer' });
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
