import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { Exercise } from '@alcide/shared';
import { Timer } from './Timer';

describe('Timer - interactions', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const prescribed: Exercise = {
    name: 'Pompes',
    description: 'Contrôle du mouvement',
    rest_seconds: 0,
    prescription: {
      version: 2,
      category: 'strength',
      mode: 'repetitions',
      sets: 2,
      reps: 10,
      work_seconds: 30,
      rest_seconds: 90,
      transition_seconds: 0,
    },
  };

  it('attend la validation de chaque série et mesure le temps réel en excluant la pause', () => {
    vi.useFakeTimers();
    render(
      <Timer
        exercises={[prescribed]}
        sessionMeta={{
          sourceType: 'workout',
          workoutId: '10000000-0000-4000-8000-000000000001',
          title: 'Force',
          sport: 'musculation',
          difficulty: 'beginner',
          plannedDurationMinutes: 20,
        }}
        completeAction={vi.fn()}
      />,
    );
    expect(screen.getByText(/Série 1\/2/, { selector: '.timer-stage > p' })).toBeTruthy();
    expect(screen.getByRole('timer', { name: 'Temps estimé restant : 02:30' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Démarrer' }));
    expect(screen.getByRole('button', { name: 'Départ dans 3' })).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(43_000);
    });
    expect(screen.getByText(/Série 1\/2/, { selector: '.timer-stage > p' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre' }));
    fireEvent.click(screen.getByRole('button', { name: 'Série terminée' }));
    expect(screen.getByRole('timer', { name: 'Temps restant : 01:30' })).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(90000);
    });
    expect(screen.getByText(/Série 2\/2/, { selector: '.timer-stage > p' })).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(25000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Série terminée' }));
    expect(screen.getByRole('heading', { name: 'Bilan de séance' })).toBeTruthy();
    expect(screen.getByText(/Force · 02:35/)).toBeTruthy();
  });

  it('alterne les mouvements des circuits et termine sans ajouter un repos final', () => {
    const circuit = [prescribed, { ...prescribed, name: 'Squats' }].map((ex) => ({
      ...ex,
      prescription: { ...ex.prescription!, circuit_id: 1, rest_seconds: 30 },
    }));
    render(<Timer exercises={circuit} />);
    for (const [name, tour] of [
      ['Pompes', 1],
      ['Squats', 1],
      ['Pompes', 2],
      ['Squats', 2],
    ] as const) {
      expect(screen.getByRole('heading', { name })).toBeTruthy();
      expect(screen.getByText(new RegExp(`Tour ${tour}/2`))).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Série terminée' }));
      if (name !== 'Squats' || tour !== 2)
        fireEvent.click(screen.getByRole('button', { name: 'Passer le repos' }));
    }
    expect(screen.getByText('Séance terminée')).toBeTruthy();
  });

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

  it('compte trois secondes avant de démarrer un chrono en plein écran', () => {
    const exercises: Exercise[] = [
      {
        name: 'Sprint',
        description: 'Vite',
        duration_seconds: 30,
        rest_seconds: 0,
      },
    ];
    vi.useFakeTimers();
    render(<Timer exercises={exercises} />);

    const startButton = screen.getByRole('button', { name: 'Démarrer' });
    startButton.focus();
    fireEvent.click(startButton);
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
    expect(screen.getByRole('button', { name: 'Départ dans 3' })).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
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
      vi.useFakeTimers();
      render(<Timer exercises={exercises} />);
      const startButton = screen.getByRole('button', { name: 'Démarrer' });
      startButton.focus();

      await act(async () => {
        fireEvent.click(startButton);
        await vi.advanceTimersByTimeAsync(3_000);
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

  it('synchronise la timeline plein écran avec les séries, les repos et la pause', () => {
    vi.useFakeTimers();
    render(<Timer exercises={[prescribed]} />);
    expect(screen.queryByRole('complementary', { name: 'Votre séance' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Démarrer' }));
    const timeline = screen.getByRole('complementary', { name: 'Votre séance' });
    const items = within(timeline).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]!.getAttribute('aria-current')).toBe('step');
    expect(within(items[0]!).getByText('Série 1/2 · 10 rép.')).toBeTruthy();
    expect(within(timeline).getByText('Étape 1 sur 3')).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(items[0]!.getAttribute('aria-current')).toBe('step');
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre' }));
    fireEvent.click(screen.getByRole('button', { name: 'Série terminée' }));
    expect(items[0]!.getAttribute('aria-current')).toBeNull();
    expect(within(items[0]!).getByText('Passée')).toBeTruthy();
    expect(items[1]!.getAttribute('aria-current')).toBe('step');
    expect(within(items[1]!).getByText('Repos')).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(90000);
    });
    expect(items[2]!.getAttribute('aria-current')).toBe('step');
    expect(within(timeline).getByText('Étape 3 sur 3')).toBeTruthy();
    expect(timeline.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Série terminée' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('complementary', { name: 'Votre séance' })).toBeNull();
    expect(screen.getByText('Séance terminée')).toBeTruthy();
  });

  it('suit aussi les étapes passées manuellement et conserve le focus dans le plein écran', () => {
    vi.useFakeTimers();
    render(
      <Timer
        exercises={[
          { name: 'Gainage', description: 'Respirez', duration_seconds: 40, rest_seconds: 0 },
        ]}
        warmup={[{ name: 'Mobilité', description: 'Doucement', duration_seconds: 60 }]}
        cooldown={[{ name: 'Respiration', description: 'Relâchez', duration_seconds: 30 }]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Démarrer' }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Passer' }));
    const timeline = screen.getByRole('complementary', { name: 'Votre séance' });
    expect(within(timeline).getByText('Étape 2 sur 3')).toBeTruthy();
    expect(timeline.querySelector('[aria-current="step"]')?.textContent).toContain('Gainage');
    const scroller = within(timeline).getByRole('region', { name: 'Étapes de la séance' });
    scroller.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Quitter plein écran' }),
    );
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(scroller);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Gainage' })).toBeTruthy();
  });
});
