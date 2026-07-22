import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ProgramWeek } from '@alcide/shared';

const { pathnameMock } = vi.hoisted(() => ({ pathnameMock: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: pathnameMock }));

import { ActiveNavLink } from './ActiveNavLink';
import { ProgramCard } from './ProgramCard';
import { ProgramWeekTabs } from './ProgramWeekTabs';
import {
  CardGridLoading,
  DashboardLoadingSkeleton,
  HeaderLoading,
  ListLoadingSkeleton,
  MetricRow,
  SettingsLoadingSkeleton,
} from './RouteLoading';
import { WorkoutCard } from './WorkoutCard';
import {
  EmptyState,
  GlassPanel,
  HeroVisual,
  IconBubble,
  MetricPill,
  PhoneFrame,
  ProgressRing,
} from './PremiumPrimitives';

describe('composants de presentation', () => {
  afterEach(() => {
    cleanup();
    pathnameMock.mockReset();
  });

  it('rend toutes les primitives visuelles et borne la progression', () => {
    render(
      <>
        <GlassPanel variant="strong">Contenu</GlassPanel>
        <GlassPanel variant="soft">Souple</GlassPanel>
        <IconBubble icon="activity" label="Activite" />
        <MetricPill label="Charge" value="8/10" tone="orange" />
        <MetricPill label="Etat" value="Pret" tone="lime" icon="check" />
        <ProgressRing value={120} label="avance" size="sm" />
        <ProgressRing value={-5} label="depart" size="lg" />
        <PhoneFrame>Sans image</PhoneFrame>
        <PhoneFrame imageSrc="/visuals/login-athlete.webp" imageAlt="Athlete" priority>
          Avec image
        </PhoneFrame>
        <HeroVisual />
        <EmptyState title="Vide" description="Aucun element" href="/generate" cta="Creer" />
      </>,
    );

    expect(screen.getByRole('img', { name: 'avance: 100%' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'depart: 0%' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Creer' }).getAttribute('href')).toBe('/generate');
    expect(screen.getByRole('img', { name: 'Athlete' })).toBeTruthy();
    expect(screen.getByText('Charge').classList.contains('break-words')).toBe(true);
    expect(screen.getByText('Charge').classList.contains('truncate')).toBe(false);
  });

  it('rend les variantes de squelettes avec leurs quantites', () => {
    const { rerender } = render(<HeaderLoading titleWidth="w-40" metrics={2} />);
    expect(document.querySelectorAll('.mobile-header-metrics > div')).toHaveLength(2);

    rerender(<MetricRow count={4} />);
    expect(document.querySelectorAll('.mobile-header-metrics > div')).toHaveLength(4);
    rerender(<CardGridLoading count={3} />);
    expect(document.querySelectorAll('.glass-soft')).toHaveLength(3);
    rerender(<DashboardLoadingSkeleton />);
    expect(screen.getByText(/chargement du dashboard/i)).toBeTruthy();
    rerender(<ListLoadingSkeleton label="Chargement de la liste" />);
    expect(screen.getByText('Chargement de la liste')).toBeTruthy();
    rerender(<SettingsLoadingSkeleton />);
    expect(screen.getByText(/chargement des parametres en cours/i)).toBeTruthy();
  });

  it('affiche les cartes seance et programme avec leurs liens', () => {
    render(
      <ul>
        <WorkoutCard
          workout={{
            id: 'workout-1',
            title: 'Fractionne',
            sport: 'course',
            difficulty: 'intermediate',
            durationMinutes: 30,
            createdAt: '2026-07-20T08:00:00.000Z',
          }}
          onDelete={vi.fn()}
        />
        <ProgramCard
          program={{
            id: 'program-1',
            title: 'Cycle endurance',
            sport: 'course',
            difficulty: 'beginner',
            weeksCount: 4,
            sessionsPerWeek: 3,
            sessionDurationMinutes: 45,
            createdAt: '2026-07-20T08:00:00.000Z',
          }}
          onDelete={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByRole('link', { name: /voir l'entrainement/i }).getAttribute('href')).toBe(
      '/workouts/workout-1',
    );
    expect(screen.getByRole('link', { name: /voir le programme/i }).getAttribute('href')).toBe(
      '/programs/program-1',
    );
    for (const title of ['Fractionne', 'Cycle endurance']) {
      const heading = screen.getByRole('heading', { name: title });
      expect(heading.classList.contains('break-words')).toBe(true);
      expect(heading.classList.contains('truncate')).toBe(false);
    }
  });

  it('navigue entre les semaines avec les fleches, Home et End', () => {
    const weeks = [
      {
        week_number: 1,
        theme: 'Base',
        objective: 'Construire',
        sessions: [
          {
            session_number: 1,
            title: 'Footing',
            focus: 'Endurance',
            duration_minutes: 30,
            exercises: [{ name: 'Course' }],
            warmup: [{ name: 'Mobilite' }],
          },
        ],
      },
      {
        week_number: 2,
        theme: 'Intensite',
        objective: 'Progresser',
        sessions: [
          {
            session_number: 1,
            title: 'Tempo',
            focus: 'Seuil',
            duration_minutes: 40,
            exercises: [{ name: 'Tempo' }, { name: 'Retour' }],
          },
        ],
      },
    ] as unknown as ProgramWeek[];

    render(<ProgramWeekTabs weeks={weeks} programId="program-1" />);
    const tabs = screen.getAllByRole('tab');
    expect(document.querySelectorAll('[role="tabpanel"]')).toHaveLength(2);
    for (const tab of tabs) {
      const panelId = tab.getAttribute('aria-controls');
      expect(panelId).toBeTruthy();
      expect(document.getElementById(panelId ?? '')).toBeTruthy();
    }

    const firstTab = screen.getByRole('tab', { name: 'Sem. 1' });
    fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
    expect(screen.getByRole('heading', { name: 'Intensite' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Sem. 2' }));
    expect(document.getElementById(firstTab.getAttribute('aria-controls') ?? '')?.hidden).toBe(true);
    fireEvent.keyDown(document.activeElement ?? document, { key: 'Home' });
    expect(screen.getByRole('heading', { name: 'Base' })).toBeTruthy();
    fireEvent.keyDown(document.activeElement ?? document, { key: 'End' });
    expect(screen.getByRole('heading', { name: 'Intensite' })).toBeTruthy();
  });

  it('distingue un lien actif, racine et une navigation en attente', () => {
    pathnameMock.mockReturnValue('/workouts/detail');
    const { rerender } = render(<ActiveNavLink href="/workouts" label="Seances" icon="activity" />);
    expect(screen.getByRole('link').getAttribute('aria-current')).toBe('page');

    pathnameMock.mockReturnValue('/dashboard');
    rerender(<ActiveNavLink href="/" label="Accueil" icon="home" compact />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('aria-current')).toBeNull();
    expect(link.classList.contains('text-zinc-200')).toBe(true);
    expect(link.classList.contains('text-zinc-400')).toBe(false);
    fireEvent.click(link);
    expect(link.getAttribute('aria-busy')).toBe('true');
  });
});
