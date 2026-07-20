import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/lib/auth', () => ({ signIn: vi.fn() }));

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
  afterEach(cleanup);

  it('rend la page d accueil et ses appels a l action', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Alcide prepare');
    expect(screen.getByRole('link', { name: 'Creer une seance' }).getAttribute('href')).toBe(
      '/generate',
    );
    expect(screen.getByRole('link', { name: 'Planifier un cycle' }).getAttribute('href')).toBe(
      '/programs/generate',
    );
  });

  it('rend les pages de connexion, confidentialite et 404', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { rerender } = render(<LoginPage />);
    expect(screen.getByRole('button', { name: /continuer avec google/i })).toBeTruthy();
    rerender(<PrivacyPage />);
    expect(screen.getByRole('heading', { name: /confidentialit/i })).toBeTruthy();
    rerender(<NotFound />);
    expect(screen.getByRole('heading', { name: 'Page introuvable' })).toBeTruthy();
    consoleError.mockRestore();
  });

  it('journalise le digest sans exposer l erreur et permet de reessayer', () => {
    const reset = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<ErrorPage error={Object.assign(new Error('secret interne'), { digest: 'digest-1' })} reset={reset} />);

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
