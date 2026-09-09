import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/lib/auth', () => ({ signIn: vi.fn() }));
vi.mock('@/lib/jury-auth', () => ({ isJuryAccessAvailable: () => true }));
vi.mock('server-only', () => ({}));

import ErrorPage from './error';
import LoginPage from './(auth)/login/page';
import { GET as getHealth } from './api/health/route';
import PrivacyPage from './confidentialite/page';
import DashboardLoading from './dashboard/loading';
import GenerateLoading from './generate/loading';
import HomePage from './page';
import NotFound from './not-found';
import ProgramDetailLoading from './programs/[id]/loading';
import ProgramsLoading from './programs/loading';
import SettingsLoading from './settings/loading';
import WorkoutDetailLoading from './workouts/[id]/loading';
import WorkoutsLoading from './workouts/loading';

describe('pages publiques et etats de chargement', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it('propose un accès explicite à la démonstration sans bouton Google dans l’aperçu isolé', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const [key, value] of Object.entries({
      ALCIDE_LOCAL_PREVIEW: 'true',
      AUTH_URL: 'http://127.0.0.1:3100',
      API_URL: 'http://127.0.0.1:3101',
      NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3101',
      JURY_ACCESS_USER_ID: 'jury-ui-preview',
      JURY_ACCESS_EMAIL: 'ui-preview@alcide.invalid',
      JURY_ACCESS_IDENTIFIER: 'test-preview',
      ALCIDE_PREVIEW_PASSWORD: 'temporary-preview-test-password',
    }))
      vi.stubEnv(key, value);
    render(await LoginPage({ searchParams: Promise.resolve({ callbackUrl: '/programs' }) }));
    expect(screen.getByRole('button', { name: 'Explorer l’aperçu' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /google/i })).toBeNull();
    expect(screen.queryByLabelText(/mot de passe/i)).toBeNull();
    expect(document.body.textContent).not.toContain('temporary-preview-test-password');
    expect(screen.getByText(/données de démonstration/i)).toBeTruthy();
    consoleError.mockRestore();
  });

  it('rend la page d accueil et ses appels a l action', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Créer une séance');
    expect(
      screen.getByRole('heading', { name: 'Un cadre clair. La liberté d’avancer.' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Gagner en force' }));
    fireEvent.click(screen.getByRole('radio', { name: '45 min' }));
    const href = screen.getByRole('link', { name: 'Personnaliser ma séance' }).getAttribute('href');
    expect(href).toBe('/generate?goal=Gagner+en+force&duration=45');
    expect(screen.getByRole('link', { name: /Je préfère un programme/ }).getAttribute('href')).toBe(
      '/programs/generate',
    );
  });

  it('rend les pages de connexion, confidentialite et 404', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { rerender } = render(await LoginPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole('button', { name: /continuer avec google/i })).toBeTruthy();
    expect(screen.getByRole('group', { name: /accès jury/i })).toBeTruthy();
    expect(screen.getByLabelText(/identifiant jury/i).getAttribute('autocomplete')).toBe(
      'username',
    );
    expect(screen.getByLabelText(/^mot de passe$/i).getAttribute('autocomplete')).toBe(
      'current-password',
    );
    rerender(<PrivacyPage />);
    expect(screen.getByRole('heading', { name: /confidentialit/i })).toBeTruthy();
    expect(screen.getByText(/Information mise/i).classList.contains('text-zinc-200')).toBe(true);
    rerender(<NotFound />);
    expect(screen.getByRole('heading', { name: 'Page introuvable' })).toBeTruthy();
    consoleError.mockRestore();
  });

  it('affiche une erreur jury générique sans révéler la cause', async () => {
    render(
      await LoginPage({
        searchParams: Promise.resolve({ error: 'CredentialsSignin', code: 'credentials' }),
      }),
    );
    expect(screen.getByRole('alert').textContent).toMatch(/connexion impossible/i);
    expect(screen.getByRole('alert').textContent).not.toMatch(/mot de passe incorrect/i);
  });

  it('journalise le digest sans exposer l erreur et permet de reessayer', () => {
    const reset = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorPage
        error={Object.assign(new Error('secret interne'), { digest: 'digest-1' })}
        reset={reset}
      />,
    );

    expect(screen.queryByText('secret interne')).toBeNull();
    expect(consoleError).toHaveBeenCalledWith('[ErrorBoundary]', 'digest-1');
    fireEvent.click(screen.getByRole('button', { name: 'Reessayer' }));
    expect(reset).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it('retourne un healthcheck non mis en cache', async () => {
    const response = getHealth();
    const body = (await response.json()) as { status: string; service: string; version: string };

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
    expect(body).toMatchObject({ status: 'ok', service: 'alcide-web' });
    expect(typeof body.version).toBe('string');
  });

  it('rend chaque etat de chargement avec aria-busy', () => {
    const components = [
      <DashboardLoading key="dashboard" />,
      <GenerateLoading key="generate" />,
      <ProgramsLoading key="programs" />,
      <ProgramDetailLoading key="program-detail" />,
      <SettingsLoading key="settings" />,
      <WorkoutsLoading key="workouts" />,
      <WorkoutDetailLoading key="workout-detail" />,
    ];

    for (const component of components) {
      const { unmount } = render(component);
      expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
      unmount();
    }
  });
});
