import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { buildSessionSchedule, type SessionStep } from '@alcide/shared';
import { TimerTimeline } from './TimerTimeline';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('TimerTimeline', () => {
  it('distingue les tours, les transitions, le mode manuel et les trois états', () => {
    const steps = buildSessionSchedule(
      [
        {
          name: 'Pompes',
          description: 'Contrôle',
          rest_seconds: 0,
          prescription: {
            version: 2,
            category: 'strength',
            mode: 'repetitions',
            sets: 2,
            reps: 10,
            work_seconds: 30,
            rest_seconds: 90,
            transition_seconds: 25,
            circuit_id: 1,
          },
        },
        { name: 'Étirement libre', description: 'Libre', rest_seconds: 0 },
      ],
      [{ name: 'Mobilité', description: 'Doucement', duration_seconds: 60 }],
      [{ name: 'Respiration', description: 'Calme', duration_seconds: 20 }],
    );
    render(<TimerTimeline steps={steps} currentIndex={3} />);
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]!).getByText('Passée')).toBeTruthy();
    expect(within(items[0]!).getByText('1 min')).toBeTruthy();
    expect(within(items[1]!).getByText('Tour 1/2 · 10 rép.')).toBeTruthy();
    expect(within(items[2]!).getByText('1 min 30 s')).toBeTruthy();
    expect(items[3]!.getAttribute('aria-current')).toBe('step');
    expect(within(items[3]!).getByText('En cours')).toBeTruthy();
    expect(within(items[3]!).getByText('Tour 2/2 · 10 rép.')).toBeTruthy();
    expect(within(items[4]!).getByText('Préparez Étirement libre')).toBeTruthy();
    expect(within(items[4]!).getByText('À venir')).toBeTruthy();
    expect(within(items[5]!).getByText('À votre rythme')).toBeTruthy();
    expect(within(items[6]!).getByText('Retour au calme')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('repositionne uniquement la liste lorsque l’étape active sort de sa zone visible', () => {
    const steps: SessionStep[] = Array.from({ length: 8 }, (_, index) => ({
      id: `step-${index}`,
      type: 'exercise',
      title: `Exercice ${index}`,
      durationSeconds: 30,
      plannedSeconds: 30,
    }));
    const { rerender } = render(<TimerTimeline steps={steps} currentIndex={0} />);
    const scroller = screen.getByRole('region', { name: 'Étapes de la séance' });
    const last = screen.getAllByRole('listitem')[7]!;
    vi.spyOn(scroller, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 300,
      height: 200,
    } as DOMRect);
    Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 200 });
    vi.spyOn(last, 'getBoundingClientRect').mockReturnValue({
      top: 500,
      bottom: 580,
      height: 80,
    } as DOMRect);
    scroller.focus();
    rerender(<TimerTimeline steps={steps} currentIndex={7} />);
    expect(scroller.scrollTop).toBe(340);
    expect(document.activeElement).toBe(scroller);
    expect(last.getAttribute('aria-current')).toBe('step');
    expect(screen.getByText('Étape 8 sur 8')).toBeTruthy();
  });

  it('suit un redimensionnement et libère son observateur', () => {
    let notifyResize = () => {};
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          notifyResize = callback;
        }
        observe = observe;
        disconnect = disconnect;
      },
    );
    const { unmount } = render(
      <TimerTimeline
        currentIndex={0}
        steps={[
          {
            id: 'single',
            type: 'exercise',
            title: 'Gainage',
            durationSeconds: 30,
            plannedSeconds: 30,
          },
        ]}
      />,
    );
    const scroller = screen.getByRole('region', { name: 'Étapes de la séance' });
    const item = screen.getByRole('listitem');
    expect(observe).toHaveBeenCalledWith(scroller);
    vi.spyOn(scroller, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 220,
      height: 120,
    } as DOMRect);
    Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 120 });
    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
      top: 300,
      bottom: 380,
      height: 80,
    } as DOMRect);
    notifyResize();
    expect(scroller.scrollTop).toBe(180);
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
