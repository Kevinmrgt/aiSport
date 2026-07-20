import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Exercise } from '@alcide/shared';
import { Timer } from './Timer';

describe('Timer - interactions', () => {
  afterEach(cleanup);

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
