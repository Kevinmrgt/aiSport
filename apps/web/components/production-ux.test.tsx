import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WorkoutForm } from './WorkoutForm';
import { ProgramForm } from './ProgramForm';
import { SessionCompletionForm } from './SessionCompletionForm';
import { SessionSignOut } from './SessionSignOut';
import { Timer } from './Timer';
import { loginDestination } from '@/lib/login-destination';
import {
  readTimerProgress,
  timerSignature,
  TIMER_STORAGE_KEY,
  writeTimerProgress,
} from '@/lib/timer-storage';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  delete document.body.dataset.timerSession;
  vi.useRealTimers();
});

function fillWorkout() {
  fireEvent.change(screen.getByLabelText(/^sport/i), { target: { value: 'course' } });
  fireEvent.change(screen.getByLabelText(/objectifs/i), {
    target: { value: 'Endurance progressive' },
  });
}

describe('production UX contracts', () => {
  it.each([WorkoutForm, ProgramForm])(
    'announces a constraints validation failure and focuses its field',
    async (Form) => {
      const submit = vi.fn().mockResolvedValue(undefined);
      render(<Form onSubmit={submit} />);
      fillWorkout();
      const constraints = screen.getByLabelText(/matériel et espace/i);
      fireEvent.change(constraints, { target: { value: 'x'.repeat(501) } });
      fireEvent.submit(screen.getByRole('form'));
      expect((await screen.findByRole('alert')).textContent).toMatch(/500/);
      expect(document.activeElement).toBe(constraints);
      expect(constraints.getAttribute('aria-invalid')).toBe('true');
      expect(submit).not.toHaveBeenCalled();
    },
  );

  it.each([WorkoutForm, ProgramForm])(
    'keeps the generation key across network retries and rotates it after changed input',
    async (Form) => {
      const submit = vi.fn().mockRejectedValue(new Error('Réseau indisponible'));
      render(<Form onSubmit={submit} />);
      fillWorkout();
      fireEvent.submit(screen.getByRole('form'));
      await screen.findByRole('alert');
      const first: unknown = submit.mock.calls[0]?.[1];
      fireEvent.submit(screen.getByRole('form'));
      await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
      expect(submit.mock.calls[1]?.[1]).toBe(first);
      await screen.findByRole('alert');
      fireEvent.change(screen.getByLabelText(/objectifs/i), {
        target: { value: 'Améliorer la technique' },
      });
      fireEvent.submit(screen.getByRole('form'));
      await waitFor(() => expect(submit).toHaveBeenCalledTimes(3));
      expect(submit.mock.calls[2]?.[1]).not.toBe(first);
    },
  );

  it.each([WorkoutForm, ProgramForm])(
    'requires explicit permission before replacing a known failed operation key',
    async (Form) => {
      const submit = vi
        .fn()
        .mockResolvedValue({ error: 'Tentative arrêtée', retryWithNewOperation: true });
      render(<Form onSubmit={submit} />);
      fillWorkout();
      fireEvent.submit(screen.getByRole('form'));
      const reset = await screen.findByRole('button', {
        name: /autoriser une nouvelle tentative/i,
      });
      const first: unknown = submit.mock.calls[0]?.[1];
      fireEvent.click(reset);
      fireEvent.submit(screen.getByRole('form'));
      await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
      expect(submit.mock.calls[1]?.[1]).not.toBe(first);
    },
  );

  it('submits only one generation when two events arrive before React updates the button', async () => {
    let release: ((value: undefined) => void) | undefined;
    const pending = new Promise<undefined>((resolve) => {
      release = resolve;
    });
    const submit = vi.fn().mockReturnValue(pending);
    render(<WorkoutForm onSubmit={submit} />);
    fillWorkout();
    fireEvent.submit(screen.getByRole('form'));
    fireEvent.submit(screen.getByRole('form'));
    expect(submit).toHaveBeenCalledOnce();
    await act(async () => {
      release?.(undefined);
      await pending;
    });
  });

  it('keeps a journal operation and completion time on an uncertain retry', async () => {
    const complete = vi.fn().mockRejectedValue(new Error('response lost'));
    render(
      <SessionCompletionForm
        sessionMeta={{
          sourceType: 'workout',
          workoutId: 'workout-test',
          title: 'Test',
          sport: 'course',
          difficulty: 'beginner',
          plannedDurationMinutes: 30,
        }}
        durationSeconds={120}
        completeAction={complete}
      />,
    );
    fireEvent.submit(
      screen.getByRole('button', { name: /enregistrer le retour/i }).closest('form')!,
    );
    await screen.findByText(/impossible d.enregistrer/i);
    fireEvent.submit(
      screen.getByRole('button', { name: /enregistrer le retour/i }).closest('form')!,
    );
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(2));
    expect(complete.mock.calls[1]?.[0]).toEqual(complete.mock.calls[0]?.[0]);
  });

  it('accepts internal login destinations and rejects external or encoded redirect tricks', () => {
    expect(loginDestination(['/programs', '//hostile.test'])).toBe('/generate');
    expect(loginDestination('/programs/generate?mode=cycle')).toBe('/programs/generate?mode=cycle');
    for (const value of [
      'https://hostile.test',
      '//hostile.test',
      '/%2fhostile.test',
      '/\\hostile.test',
      '/api/auth/signout',
      '/login',
      '/%00bad',
    ]) {
      expect(loginDestination(value)).toBe('/generate');
    }
  });

  it('restores an authenticated timer only after confirmation and leaves it paused', () => {
    document.body.dataset.timerSession = 'synthetic-session-1';
    const exercises = [
      { name: 'Course', description: 'Régulière', duration_seconds: 30, rest_seconds: 0 },
    ];
    writeTimerProgress({
      version: 1,
      scope: 'synthetic-session-1',
      signature: timerSignature(window.location.pathname, [30]),
      savedAt: Date.now(),
      index: 0,
      secondsLeft: 17,
      activeMs: 13_000,
    });
    render(<Timer exercises={exercises} />);
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Restaurer la séance en pause' }));
    expect(screen.getByRole('button', { name: 'Reprendre' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    vi.useFakeTimers();
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.getByRole('button', { name: 'Reprendre' })).toBeTruthy();
  });

  it('rejects stale timers and snapshots from a different login session', () => {
    const snapshot = {
      version: 1 as const,
      scope: 'old-session',
      signature: 'shape',
      savedAt: Date.now(),
      index: 0,
      secondsLeft: 17,
      activeMs: 13_000,
    };
    writeTimerProgress(snapshot);
    expect(readTimerProgress('new-session', 'shape', [30])).toBeNull();
    writeTimerProgress({ ...snapshot, savedAt: Date.now() - 13 * 60 * 60 * 1000 });
    expect(readTimerProgress('old-session', 'shape', [30])).toBeNull();
    expect(sessionStorage.getItem(TIMER_STORAGE_KEY)).toBeNull();
  });

  it('shows the sign out control on small screens and clears timer storage on submit', async () => {
    sessionStorage.setItem(TIMER_STORAGE_KEY, 'synthetic snapshot');
    const action = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    render(<SessionSignOut action={action} />);
    const button = screen.getByRole('button', { name: 'Se deconnecter' });
    expect(button.classList.contains('hidden')).toBe(false);
    expect(button.classList.contains('min-h-11')).toBe(true);
    fireEvent.submit(button.closest('form')!);
    expect(sessionStorage.getItem(TIMER_STORAGE_KEY)).toBeNull();
    await waitFor(() => expect(action).toHaveBeenCalledOnce());
  });
});
