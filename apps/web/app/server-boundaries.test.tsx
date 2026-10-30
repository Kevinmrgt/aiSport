import { Children, isValidElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GenerateProgramInput, GenerateWorkoutInput } from '@alcide/shared';

const boundary = vi.hoisted(() => {
  class ApiError extends Error {
    constructor(
      message: string,
      readonly status: number,
      readonly code?: string,
    ) {
      super(message);
    }
  }
  return {
    auth: vi.fn<() => Promise<unknown>>(),
    signOut: vi.fn<(options: { redirectTo: string }) => Promise<void>>(),
    redirect: vi.fn((path: string): never => {
      throw new Error(`REDIRECT:${path}`);
    }),
    ApiError,
    api: {
      generateWorkout: vi.fn(),
      generateProgram: vi.fn(),
      exportAccount: vi.fn(),
      deleteAccount: vi.fn(),
    },
  };
});
vi.mock('@/lib/auth', () => ({ auth: boundary.auth, signOut: boundary.signOut }));
vi.mock('@/lib/server-api', () => ({ serverApi: boundary.api, ServerApiError: boundary.ApiError }));
vi.mock('next/navigation', () => ({ redirect: boundary.redirect }));

import GeneratePage from './generate/page';
import GenerateProgramPage from './programs/generate/page';
import SettingsPage from './settings/page';
import { GET as exportAccount } from './api/account/export/route';
import { WorkoutForm } from '@/components/WorkoutForm';
import { ProgramForm } from '@/components/ProgramForm';
import { AccountControls } from '@/components/AccountControls';

function componentProps<T>(tree: ReactNode, type: unknown): T {
  const search = (node: ReactNode): T | undefined => {
    for (const child of Children.toArray(node)) {
      if (!isValidElement<{ children?: ReactNode }>(child)) continue;
      if (child.type === type) return child.props as T;
      const nested = search(child.props.children);
      if (nested) return nested;
    }
    return undefined;
  };
  const props = search(tree);
  if (!props) throw new Error('Expected server/client action boundary not found');
  return props;
}

type GenerationAction = (
  data: GenerateWorkoutInput | GenerateProgramInput,
  operationId: string,
) => Promise<{ error?: string; retryWithNewOperation?: boolean } | void>;
const workout: GenerateWorkoutInput = {
  sport: 'course',
  level: 'beginner',
  duration_minutes: 30,
  goals: 'Endurance',
};
const program: GenerateProgramInput = {
  sport: 'course',
  level: 'beginner',
  weeks_count: 2,
  sessions_per_week: 2,
  session_duration_minutes: 20,
  goals: 'Endurance',
};
const operation = '11111111-1111-4111-8111-111111111111';

describe('authenticated server action boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    boundary.auth.mockResolvedValue({ user: { id: 'owner' } });
    boundary.signOut.mockResolvedValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  for (const fixture of [
    {
      page: GeneratePage,
      form: WorkoutForm,
      api: boundary.api.generateWorkout,
      input: workout,
      login: '/login?callbackUrl=%2Fgenerate',
      result: '/workouts/result',
    },
    {
      page: GenerateProgramPage,
      form: ProgramForm,
      api: boundary.api.generateProgram,
      input: program,
      login: '/login?callbackUrl=%2Fprograms%2Fgenerate',
      result: '/programs/result',
    },
  ]) {
    it(`${fixture.login}: redirects anonymous callers before the generation API`, async () => {
      for (const session of [null, {}]) {
        boundary.auth.mockResolvedValue(session);
        await expect(fixture.page()).rejects.toThrow(`REDIRECT:${fixture.login}`);
      }
      expect(fixture.api).not.toHaveBeenCalled();
    });

    it(`${fixture.result}: forwards the stable operation key and redirects a successful result`, async () => {
      fixture.api.mockResolvedValue({ id: 'result' });
      const { onSubmit } = componentProps<{ onSubmit: GenerationAction }>(
        await fixture.page(),
        fixture.form,
      );
      await expect(onSubmit(fixture.input, operation)).rejects.toThrow(
        `REDIRECT:${fixture.result}`,
      );
      expect(fixture.api).toHaveBeenCalledWith(fixture.input, operation);
    });

    it(`${fixture.result}: only a known failed operation permits a new operation key`, async () => {
      const { onSubmit } = componentProps<{ onSubmit: GenerationAction }>(
        await fixture.page(),
        fixture.form,
      );
      fixture.api.mockRejectedValueOnce(
        new boundary.ApiError('Echec etabli', 409, 'GENERATION_RETRY_REQUIRES_NEW_KEY'),
      );
      await expect(onSubmit(fixture.input, operation)).resolves.toEqual({
        error: 'Echec etabli',
        retryWithNewOperation: true,
      });
      fixture.api.mockRejectedValueOnce(
        new boundary.ApiError('Operation encore active', 409, 'GENERATION_CONFLICT'),
      );
      await expect(onSubmit(fixture.input, operation)).resolves.toEqual({
        error: 'Operation encore active',
        retryWithNewOperation: false,
      });
      fixture.api.mockRejectedValueOnce(new Error('Reseau indisponible'));
      await expect(onSubmit(fixture.input, operation)).resolves.toMatchObject({
        retryWithNewOperation: false,
      });
      fixture.api.mockRejectedValueOnce('unexpected non-error');
      await expect(onSubmit(fixture.input, operation)).resolves.toEqual({
        error: 'Erreur inattendue, veuillez reessayer',
        retryWithNewOperation: false,
      });
    });
  }

  it('requires account erasure confirmation and signs out only after confirmed deletion', async () => {
    const { deleteAction } = componentProps<{
      deleteAction: (confirmation: string) => Promise<{ error?: string } | void>;
    }>(await SettingsPage(), AccountControls);
    await expect(deleteAction('wrong')).resolves.toMatchObject({
      error: 'Confirmez avec SUPPRIMER.',
    });
    expect(boundary.api.deleteAccount).not.toHaveBeenCalled();
    boundary.api.deleteAccount.mockRejectedValueOnce(new Error('private backend diagnostics'));
    const failed = await deleteAction('SUPPRIMER');
    expect(failed?.error).not.toContain('private backend diagnostics');
    expect(boundary.signOut).not.toHaveBeenCalled();
    boundary.api.deleteAccount.mockResolvedValueOnce({ ok: true });
    await expect(deleteAction('SUPPRIMER')).resolves.toBeUndefined();
    expect(boundary.signOut).toHaveBeenCalledWith({ redirectTo: '/?account=deleted' });
  });

  it('protects settings before rendering its account actions', async () => {
    boundary.auth.mockResolvedValue(null);
    await expect(SettingsPage()).rejects.toThrow('REDIRECT:/login?callbackUrl=%2Fsettings');
    expect(boundary.api.deleteAccount).not.toHaveBeenCalled();
  });

  it('exports only for an authenticated account, with private and attachment headers', async () => {
    for (const session of [null, {}, { user: {} }]) {
      boundary.auth.mockResolvedValue(session);
      const response = await exportAccount();
      expect(response.status).toBe(401);
      expect(response.headers.get('cache-control')).toBe('no-store, private');
    }
    expect(boundary.api.exportAccount).not.toHaveBeenCalled();
    boundary.auth.mockResolvedValue({ user: { id: 'owner' } });
    boundary.api.exportAccount.mockResolvedValue({ account: { id: 'owner' }, workouts: [] });
    const response = await exportAccount();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition')).toContain('attachment;');
    expect(response.headers.get('cache-control')).toBe('no-store, private');
    await expect(response.json()).resolves.toMatchObject({ account: { id: 'owner' } });
  });

  it('keeps export failures private and never downloads backend error contents', async () => {
    for (const [error, status] of [
      [new boundary.ApiError('PRIVATE_DIAGNOSTIC', 403), 403],
      [new Error('PRIVATE_DIAGNOSTIC'), 503],
    ] as const) {
      boundary.api.exportAccount.mockRejectedValueOnce(error);
      const response = await exportAccount();
      expect(response.status).toBe(status);
      expect(response.headers.get('cache-control')).toBe('no-store, private');
      expect(response.headers.get('content-disposition')).toBeNull();
      expect(await response.text()).not.toContain('PRIVATE_DIAGNOSTIC');
    }
  });
});
