import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { authMock, redirectMock, revalidateMock, apiMock, pathnameMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  pathnameMock: vi.fn(),
  redirectMock: vi.fn((destination: string): never => {
    throw new Error(`redirect:${destination}`);
  }),
  revalidateMock: vi.fn(),
  apiMock: {
    getWorkouts: vi.fn(),
    deleteWorkout: vi.fn(),
    getGenerationQuota: vi.fn(),
    generateWorkout: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({ auth: authMock }));
vi.mock('@/lib/server-api', () => ({ serverApi: apiMock }));
vi.mock('next/navigation', () => ({ redirect: redirectMock, usePathname: pathnameMock }));
vi.mock('next/cache', () => ({ revalidatePath: revalidateMock }));

import WorkoutsPage from './workouts/page';
import GeneratePage from './generate/page';
import { PasswordField } from '@/components/PasswordField';
import { RouteBackdrop } from '@/components/RouteBackdrop';

const workout = {
  id: '10000000-0000-4000-8000-000000000001',
  title: 'Séance conservée',
  sport: 'Course',
  difficulty: 'intermediate',
  durationMinutes: 30,
  createdAt: '2026-09-09T10:00:00Z',
};

describe('parcours préservés par la refonte', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: 'test-user' } });
    apiMock.getWorkouts.mockResolvedValue({ workouts: [], total: 0, hasMore: false });
    apiMock.getGenerationQuota.mockResolvedValue({ limited: false, remaining: null });
    apiMock.deleteWorkout.mockResolvedValue(undefined);
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('protège l’historique avant toute lecture de données', async () => {
    authMock.mockResolvedValue(null);
    await expect(WorkoutsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      'redirect:/login',
    );
    expect(apiMock.getWorkouts).not.toHaveBeenCalled();
  });

  it.each([
    [{}, 'Aucune séance pour le moment', false],
    [{ sport: ' Course ' }, 'Aucun résultat', true],
    [{ level: 'advanced' }, 'Aucun résultat', true],
    [{ page: '-3', sport: ' ' }, 'Aucune séance pour le moment', false],
  ] as const)(
    'distingue un historique vide des filtres sans résultat : %j',
    async (query, title, reset) => {
      render(await WorkoutsPage({ searchParams: Promise.resolve(query) }));
      expect(screen.getByRole('heading', { name: title })).toBeTruthy();
      expect(Boolean(screen.queryByRole('link', { name: 'Effacer' }))).toBe(reset);
      expect(apiMock.getWorkouts).toHaveBeenCalledWith({
        page: 1,
        sport: 'sport' in query ? query.sport.trim() || undefined : undefined,
        level: 'level' in query ? query.level : undefined,
      });
      expect(screen.getByRole('link', { name: 'Créer une séance' }).getAttribute('href')).toBe(
        '/generate',
      );
    },
  );

  it.each([
    [1, 10, true, undefined, '/workouts?page=2&sport=Course&level=intermediate'],
    [
      2,
      19,
      true,
      '/workouts?page=1&sport=Course&level=intermediate',
      '/workouts?page=3&sport=Course&level=intermediate',
    ],
    [3, 19, false, '/workouts?page=2&sport=Course&level=intermediate', undefined],
  ] as const)(
    'conserve les filtres et les bornes de la page %i',
    async (page, total, hasMore, previous, next) => {
      apiMock.getWorkouts.mockResolvedValue({ workouts: [workout], total, hasMore });
      render(
        await WorkoutsPage({
          searchParams: Promise.resolve({
            page: String(page),
            sport: 'Course',
            level: 'intermediate',
          }),
        }),
      );
      expect(screen.queryByRole('link', { name: 'Précédent' })?.getAttribute('href')).toBe(
        previous,
      );
      expect(screen.queryByRole('link', { name: 'Suivant' })?.getAttribute('href')).toBe(next);
      expect(screen.getByRole('searchbox', { name: 'Sport' }).getAttribute('value')).toBe('Course');
      expect(screen.getByRole<HTMLSelectElement>('combobox', { name: 'Niveau' }).value).toBe(
        'intermediate',
      );
    },
  );

  it('ouvre une séance unique sans pagination et ne supprime qu’après confirmation', async () => {
    apiMock.getWorkouts.mockResolvedValue({ workouts: [workout], total: 1, hasMore: false });
    render(await WorkoutsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByRole('navigation', { name: 'Pagination des entrainements' })).toBeNull();
    expect(screen.getByRole('link', { name: /voir l'entrainement/i }).getAttribute('href')).toBe(
      `/workouts/${workout.id}`,
    );
    fireEvent.click(screen.getByRole('button', { name: /Supprimer l'entraînement/i }));
    expect(apiMock.deleteWorkout).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    await waitFor(() => expect(revalidateMock).toHaveBeenCalledWith('/workouts'));
    expect(apiMock.deleteWorkout).toHaveBeenCalledWith(workout.id);
  });

  it.each([new Error('Service indisponible'), 'erreur interne non structurée'])(
    'garde une suppression échouée réessayable et permet de l’annuler',
    async (failure) => {
      apiMock.getWorkouts.mockResolvedValue({ workouts: [workout], total: 1, hasMore: false });
      apiMock.deleteWorkout.mockRejectedValue(failure);
      render(await WorkoutsPage({ searchParams: Promise.resolve({}) }));
      fireEvent.click(screen.getByRole('button', { name: /Supprimer l'entraînement/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
      expect((await screen.findByRole('alert')).textContent).toBe(
        failure instanceof Error ? failure.message : "Impossible de supprimer l'entraînement.",
      );
      expect(revalidateMock).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
      expect(screen.queryByRole('group', { name: 'Confirmer la suppression' })).toBeNull();
    },
  );

  it('garde les choix de l’accueil pendant le passage par la connexion', async () => {
    authMock.mockResolvedValue(null);
    await expect(
      GeneratePage({ searchParams: Promise.resolve({ goal: 'Gagner en force', duration: '45' }) }),
    ).rejects.toThrow('redirect:');
    expect(redirectMock).toHaveBeenCalledOnce();
    const login = new URL(redirectMock.mock.calls[0]![0], 'https://example.test');
    const destination = new URL(login.searchParams.get('callbackUrl')!, 'https://example.test');
    expect(login.pathname).toBe('/login');
    expect(destination.pathname).toBe('/generate');
    expect(destination.searchParams.get('goal')).toBe('Gagner en force');
    expect(destination.searchParams.get('duration')).toBe('45');
    expect(apiMock.getGenerationQuota).not.toHaveBeenCalled();
  });

  it.each([undefined, 'oops', '14', '181', '25.5', '45'])(
    'borne la durée initiale transmise au formulaire : %s',
    async (duration) => {
      render(await GeneratePage({ searchParams: Promise.resolve({ duration }) }));
      expect(screen.getByRole<HTMLInputElement>('spinbutton', { name: /Durée/i }).value).toBe(
        duration === '45' ? '45' : '30',
      );
      expect(screen.getByRole<HTMLTextAreaElement>('textbox', { name: /Objectifs/i }).value).toBe(
        '',
      );
    },
  );

  it('limite l’objectif transmis par URL aux 500 caractères acceptés', async () => {
    render(
      await GeneratePage({
        searchParams: Promise.resolve({ goal: 'a'.repeat(600), duration: '20' }),
      }),
    );
    expect(
      screen.getByRole<HTMLTextAreaElement>('textbox', { name: /Objectifs/i }).value,
    ).toHaveLength(500);
  });

  it('permet de vérifier puis masquer son mot de passe sans perdre la saisie', () => {
    render(<PasswordField />);
    const input = screen.getByLabelText<HTMLInputElement>('Mot de passe', { exact: true });
    fireEvent.change(input, { target: { value: 'mot-de-passe-de-test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }));
    expect(input.type).toBe('text');
    expect(
      screen.getByRole('button', { name: 'Masquer le mot de passe' }).getAttribute('aria-pressed'),
    ).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Masquer le mot de passe' }));
    expect(input.type).toBe('password');
    expect(input.value).toBe('mot-de-passe-de-test');
  });

  it.each([
    ['/', 'halo'],
    ['/login', 'cells'],
    ['/generate', 'cells'],
    ['/programs/generate', 'cells'],
    ['/dashboard', 'cells'],
    ['/workouts', 'cells'],
    ['/workouts/123', 'cells'],
    ['/programs/123', 'cells'],
    ['/programs/123/sessions/1-1', 'cells'],
    ['/programs', 'cells'],
    ['/settings', 'cells'],
    ['/confidentialite', 'cells'],
    ['/page-inconnue', 'cells'],
  ])('conserve le fond décoratif adapté à %s', (path, background) => {
    pathnameMock.mockReturnValue(path);
    const { container } = render(<RouteBackdrop />);
    const backdrop = container.firstElementChild!;
    expect(backdrop.getAttribute('aria-hidden')).toBe('true');
    expect(backdrop.getAttribute('data-background')).toBe(background);
    expect(backdrop.querySelector('canvas')).not.toBeNull();
  });
});
