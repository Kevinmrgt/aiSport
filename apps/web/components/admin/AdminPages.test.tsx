import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import type { AdminMember, AdminContent, Workout, TrainingProgram } from '@alcide/shared';
const api = vi.hoisted(() => ({
  members: vi.fn(),
  member: vi.fn(),
  summary: vi.fn(),
  analytics: vi.fn(),
  settings: vi.fn(),
  subscriptions: vi.fn(),
  credits: vi.fn(),
  audit: vi.fn(),
  contents: vi.fn(),
  content: vi.fn(),
}));
const auth = vi.hoisted(() => ({ auth: vi.fn(), signOut: vi.fn(), status: vi.fn() }));
vi.mock('@/lib/admin-api', () => ({ adminApi: api }));
vi.mock('@/lib/auth', () => ({ auth: auth.auth, signOut: auth.signOut }));
vi.mock('@/lib/server-api', () => ({
  isServerApiNotFound: (e: unknown) => e instanceof Error && e.message === '404',
  serverFetch: auth.status,
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not-found');
  },
  redirect: (p: string) => {
    throw new Error('redirect:' + p);
  },
}));
vi.mock('@/app/(administration)/admin/actions', () => ({ performAdminAction: vi.fn() }));
import { MembersPage } from './MembersPage';
import { ContentsPage } from './ContentsPage';
import { ContentDetailPage } from './ContentDetailPage';
import MemberPage from '@/app/(administration)/admin/membres/[id]/page';
import Overview from '@/app/(administration)/admin/page';
import CreditsPage from '@/app/(administration)/admin/credits/page';
import SubscriptionsPage from '@/app/(administration)/admin/abonnements/page';
import AuditPage from '@/app/(administration)/admin/journal/page';
import CreatePage from '@/app/(administration)/admin/beta/nouveau/page';
import ModelsPage from '@/app/(administration)/admin/configuration/modeles/page';
import PlatformPage from '@/app/(administration)/admin/configuration/plateforme/page';
import SuspendedPage from '@/app/(site)/compte-suspendu/page';
import ErrorPage from '@/app/(administration)/admin/error';
import Loading from '@/app/(administration)/admin/loading';
const id = '11111111-1111-4111-8111-111111111111',
  date = '2026-09-11T10:00:00Z';
const member: AdminMember = {
  id,
  email: 'member@example.com',
  name: 'Élodie',
  createdAt: date,
  suspendedAt: null,
  isAdmin: false,
  stripeCustomerId: null,
  beta: null,
  subscription: null,
  credits: { welcome: 3, premium: 4, offered: 5 },
  workoutCount: 1,
  programCount: 2,
  completedCount: 3,
  lastActivityAt: null,
};
const content: AdminContent = {
  id,
  userId: id,
  name: 'Élodie',
  email: member.email,
  title: 'Mobilité',
  sport: 'Mobilité',
  difficulty: 'beginner',
  createdAt: date,
  durationMinutes: 20,
  weeksCount: null,
  completedCount: 2,
};
const activity = {
  id,
  title: 'Activité enregistrée',
  sport: 'Mobilité',
  completedAt: date,
  durationSeconds: 1200,
};
const workout: Workout = {
  title: 'Mobilité',
  sport: 'Mobilité',
  difficulty: 'beginner',
  duration_minutes: 20,
  exercises: [
    {
      name: 'Mouvement',
      description: 'Contrôler le geste.',
      duration_seconds: 1200,
      rest_seconds: 0,
    },
  ],
};
const paged = (items: unknown[]) => ({ items, total: items.length, page: 1, pageSize: 25 });
const params = (query: Record<string, string | undefined> = {}) => ({
  searchParams: Promise.resolve(query),
});
beforeEach(() => {
  vi.clearAllMocks();
  api.members.mockResolvedValue(paged([member]));
  api.member.mockResolvedValue({ member, recentActivity: [] });
  api.contents.mockResolvedValue(paged([content]));
  api.content.mockResolvedValue({ content, data: workout, recentActivity: [activity] });
  api.settings.mockResolvedValue({
    settings: { defaultAiModel: 'gpt-5.4-mini', defaultBetaGenerationBalance: 10 },
    availableModels: [
      { id: 'gpt-5.4-mini', label: 'Modèle Mini' },
      { id: 'gpt-5.4', label: 'Modèle complet' },
    ],
  });
  auth.auth.mockResolvedValue({ user: { email: member.email } });
  auth.status.mockResolvedValue({ suspended: true });
});
afterEach(cleanup);
describe('pages administrateur reliées aux données', () => {
  it('affiche les membres et transmet la recherche, le statut et le numéro de page', async () => {
    render(await MembersPage(params({ q: 'Élodie', suspended: 'no', page: '2' })));
    expect(api.members).toHaveBeenCalledWith({ q: 'Élodie', suspended: 'no', page: 2 });
    expect(screen.getByRole('link', { name: 'Élodie' }).getAttribute('href')).toBe(
      '/admin/membres/' + id,
    );
    expect(screen.getByText('3 accueil · 4 Premium · 5 offerts')).toBeTruthy();
  });
  it('affiche les états administrateur, suspension et bêta dans la liste dédiée', async () => {
    api.members.mockResolvedValue(
      paged([
        {
          ...member,
          isAdmin: true,
          suspendedAt: date,
          name: null,
          beta: { active: false, remaining: 1, mustChangePassword: true },
          subscription: { id: 'sub', status: 'unknown', periodEnd: date, cancelAtPeriodEnd: true },
        },
        {
          ...member,
          id: 'second',
          beta: { active: true, remaining: 5, mustChangePassword: false },
          subscription: { id: 'sub2', status: 'active', periodEnd: date, cancelAtPeriodEnd: false },
        },
      ]),
    );
    render(await MembersPage({ ...params({ beta: 'none' }), betaOnly: true }));
    expect(api.members).toHaveBeenCalledWith({ page: 1, beta: 'present' });
    expect(screen.getByText('Suspendu')).toBeTruthy();
    expect(screen.getByText('Désactivé')).toBeTruthy();
    expect(screen.getByText('Administrateur')).toBeTruthy();
  });
  it.each([{}, { q: 'absent' }, { beta: 'empty' }, { page: '3' }])(
    'distingue une liste vide et une recherche sans résultat %j',
    async (query) => {
      api.members.mockResolvedValue(paged([]));
      render(await MembersPage(params(query)));
      expect(screen.getByRole('heading', { level: 2 })).toBeTruthy();
      expect(screen.queryByRole('table')).toBeNull();
    },
  );
  it('présente les soldes séparés, la protection des administrateurs et les données sportives', async () => {
    api.member.mockResolvedValue({
      member: { ...member, isAdmin: true, name: null },
      recentActivity: [activity],
    });
    render(await MemberPage({ params: Promise.resolve({ id }) }));
    expect(
      screen.getByText('Les comptes administrateurs sont protégés contre la suspension.'),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Suspendre le membre' })).toBeNull();
    expect(screen.getByText('Activité enregistrée')).toBeTruthy();
    expect(screen.getByText('Crédits offerts')).toBeTruthy();
  });
  it.each([true, false])('adapte la fiche suspendue à l’état bêta %s', async (active) => {
    api.member.mockResolvedValue({
      member: {
        ...member,
        suspendedAt: date,
        stripeCustomerId: 'cus_test',
        lastActivityAt: date,
        beta: { active, remaining: 0, mustChangePassword: active },
        subscription: {
          id: 'sub',
          status: active ? 'past_due' : 'unknown',
          periodEnd: date,
          cancelAtPeriodEnd: active,
        },
      },
      recentActivity: [],
    });
    render(await MemberPage({ params: Promise.resolve({ id }) }));
    expect(screen.getByRole('button', { name: 'Réactiver le membre' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Ouvrir Stripe/ }).getAttribute('href')).toContain(
      '/test/customers/cus_test',
    );
    expect(screen.getByText(/son historique administratif sont conservés/)).toBeTruthy();
  });
  it('propage une panne et distingue une fiche inexistante', async () => {
    await expect(MemberPage({ params: Promise.resolve({ id: 'invalide' }) })).rejects.toThrow(
      'not-found',
    );
    api.member.mockRejectedValue(new Error('404'));
    await expect(MemberPage({ params: Promise.resolve({ id }) })).rejects.toThrow('not-found');
    api.member.mockRejectedValue(new Error('API indisponible'));
    await expect(MemberPage({ params: Promise.resolve({ id }) })).rejects.toThrow(
      'API indisponible',
    );
  });
  it.each(['workouts', 'programs'] as const)(
    'consulte la liste de %s et ses filtres',
    async (kind) => {
      api.contents.mockResolvedValue(
        paged([
          { ...content, weeksCount: kind === 'programs' ? 2 : null },
          { ...content, id: 'second', name: null, difficulty: 'custom' },
        ]),
      );
      render(
        await ContentsPage({
          ...params({ sport: 'Mobilité', level: 'beginner', from: '2026-09-01' }),
          kind,
        }),
      );
      expect(api.contents).toHaveBeenCalledWith(kind, {
        page: 1,
        sport: 'Mobilité',
        level: 'beginner',
        from: '2026-09-01',
      });
      expect(screen.getAllByRole('link', { name: 'Mobilité' })).toHaveLength(2);
    },
  );
  it.each(['workouts', 'programs'] as const)(
    'affiche un contenu %s vide et des filtres invalides',
    async (kind) => {
      api.contents.mockResolvedValue(paged([]));
      render(await ContentsPage({ ...params({ q: 'absent' }), kind }));
      expect(screen.getByText('Aucun résultat')).toBeTruthy();
      cleanup();
      render(await ContentsPage({ ...params({ page: '0' }), kind }));
      expect(screen.getByRole('alert')).toBeTruthy();
    },
  );
  it('lit une séance, sa prescription et son activité sans commande de modification', async () => {
    const full = {
      ...workout,
      warmup: [{ name: 'Préparation', duration_seconds: 60, description: 'Commencer doucement' }],
      cooldown: [{ name: 'Repos', duration_seconds: 60, description: 'Respirer' }],
      exercises: [
        ...workout.exercises,
        {
          name: 'Séries',
          description: 'Répéter',
          sets: 3,
          reps: 10,
          rest_seconds: 20,
          tips: 'Conseil utile',
        },
        {
          name: 'Prescription',
          description: 'Contrôle',
          rest_seconds: 10,
          prescription: {
            sets: 2,
            reps: 8,
            rest_seconds: 10,
            transition_seconds: 5,
            circuit_id: 'A',
          },
        },
      ],
    };
    api.content.mockResolvedValue({ content, data: full, recentActivity: [activity] });
    render(await ContentDetailPage({ kind: 'workouts', params: Promise.resolve({ id }) }));
    expect(screen.getByText('Échauffement')).toBeTruthy();
    expect(screen.getByText('Conseil utile')).toBeTruthy();
    expect(screen.getByText(/Circuit A/)).toBeTruthy();
    expect(screen.getByText('Activité enregistrée')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /modifier/i })).toBeNull();
  });
  it('affiche la progression, les semaines et les prescriptions au temps', async () => {
    const data: TrainingProgram = {
      ...workout,
      weeks_count: 2,
      sessions_per_week: 1,
      session_duration_minutes: 20,
      progression_summary: 'Progression enregistrée',
      weeks: [1, 2].map((n) => ({
        week_number: n,
        theme: 'Régularité',
        objective: 'Pratiquer',
        sessions: [
          {
            ...workout,
            session_number: 1,
            focus: 'Contrôle',
            exercises: [
              {
                ...workout.exercises[0]!,
                prescription: {
                  version: 2,
                  category: 'mobility',
                  mode: 'mobility',
                  sets: 2,
                  work_seconds: 20,
                  rest_seconds: 10,
                  transition_seconds: 5,
                },
              },
            ],
          },
        ],
      })),
    };
    api.content.mockResolvedValue({
      content: { ...content, weeksCount: 2, difficulty: 'custom', name: null },
      data,
      recentActivity: [],
    });
    render(await ContentDetailPage({ kind: 'programs', params: Promise.resolve({ id }) }));
    expect(screen.getByText('Progression enregistrée')).toBeTruthy();
    expect(screen.getAllByText(/20s d’effort/)).toHaveLength(2);
  });
  it('refuse les identifiants de contenu invalides et relaie les erreurs', async () => {
    await expect(
      ContentDetailPage({ kind: 'workouts', params: Promise.resolve({ id: 'x' }) }),
    ).rejects.toThrow('not-found');
    api.content.mockRejectedValue(new Error('404'));
    await expect(
      ContentDetailPage({ kind: 'programs', params: Promise.resolve({ id }) }),
    ).rejects.toThrow('not-found');
    api.content.mockRejectedValue(new Error('Service indisponible'));
    await expect(
      ContentDetailPage({ kind: 'workouts', params: Promise.resolve({ id }) }),
    ).rejects.toThrow('Service indisponible');
  });
  it('affiche les abonnements, échéances et liens Stripe de test', async () => {
    api.subscriptions.mockResolvedValue(
      paged([
        {
          id: 'sub_test',
          userId: id,
          email: member.email,
          name: null,
          status: 'past_due',
          periodEnd: date,
          cancelAtPeriodEnd: true,
          updatedAt: date,
        },
        {
          id: 'sub_second',
          userId: id,
          email: member.email,
          name: 'Élodie',
          status: 'unknown',
          periodEnd: date,
          cancelAtPeriodEnd: false,
          updatedAt: date,
        },
      ]),
    );
    render(await SubscriptionsPage(params()));
    expect(screen.getByText('Programmée à l’échéance')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Ouvrir ↗' })[0]?.getAttribute('href')).toBe(
      'https://dashboard.stripe.com/test/subscriptions/sub_test',
    );
  });
  it('différencie les quatre natures de crédits et leurs expirations', async () => {
    api.credits.mockResolvedValue(
      paged(
        ['welcome', 'premium', 'offered', 'beta'].map((kind, i) => ({
          id: String(i),
          userId: i === 3 ? null : id,
          email: member.email,
          kind,
          amount: i === 3 ? -2 : 5,
          remaining: 3,
          balanceAfter: 8,
          createdAt: date,
          expiresAt: i === 1 ? date : null,
          reason: i === 2 ? 'Geste commercial' : null,
        })),
      ),
    );
    render(await CreditsPage(params()));
    expect(screen.getByText('Générations bêta')).toBeTruthy();
    expect(screen.getByText('Geste commercial')).toBeTruthy();
    expect(screen.getAllByText('Sans expiration')).toHaveLength(2);
  });
  it('affiche un journal filtré avec les changements, même sans membre conservé', async () => {
    api.audit.mockResolvedValue({
      ...paged([
        {
          id: 'a',
          userId: id,
          targetEmail: member.email,
          actorEmail: 'admin@example.com',
          createdAt: date,
          action: 'credits.granted',
          reason: 'Motif documenté',
          changes: {
            before: null,
            after: { amount: 5 },
            sessionsRevoked: true,
            accessRemoved: false,
            custom: 'Valeur',
          },
        },
        {
          id: 'b',
          userId: null,
          targetEmail: null,
          actorEmail: 'admin@example.com',
          createdAt: date,
          action: 'future.action',
          reason: 'Règle',
          changes: {},
        },
        {
          id: 'c',
          userId: id,
          targetEmail: null,
          actorEmail: 'admin@example.com',
          createdAt: date,
          action: 'beta.deleted',
          reason: 'Retrait',
          changes: {},
        },
      ]),
      trackingSince: date,
    });
    render(await AuditPage(params({ actor: 'admin@example.com', userId: id })));
    expect(api.audit).toHaveBeenCalledWith({ page: 1, actor: 'admin@example.com', userId: id });
    expect(screen.getByText('Motif documenté')).toBeTruthy();
    expect(screen.getByText('Plateforme')).toBeTruthy();
    expect(screen.getByText('Valeur')).toBeTruthy();
  });
  it.each([
    { load: CreditsPage, name: 'credits' },
    { load: SubscriptionsPage, name: 'subscriptions' },
    { load: AuditPage, name: 'audit' },
  ] as const)('gère le vide et les filtres invalides de $name', async ({ load, name }) => {
    api[name].mockResolvedValue({ ...paged([]), trackingSince: date });
    render(await load(params()));
    expect(screen.queryByRole('table')).toBeNull();
    cleanup();
    render(await load(params({ q: 'absent' })));
    expect(screen.getByText('Aucun résultat')).toBeTruthy();
    cleanup();
    render(await load(params({ from: 'bad' })));
    expect(screen.getByRole('alert')).toBeTruthy();
  });
  it('présente les valeurs enregistrées et préremplit la création bêta', async () => {
    render(
      await CreatePage({ searchParams: Promise.resolve({ email: member.email, name: 'Élodie' }) }),
    );
    expect(screen.getByLabelText<HTMLInputElement>('Adresse e-mail').value).toBe(member.email);
    cleanup();
    render(await CreatePage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByLabelText<HTMLInputElement>('Générations initiales').value).toBe('10');
    cleanup();
    render(await ModelsPage());
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    cleanup();
    render(await PlatformPage());
    expect(screen.getByText(/Valeur enregistrée : 10/)).toBeTruthy();
  });
  it('relie les indicateurs aux listes réellement disponibles', async () => {
    api.summary.mockResolvedValue({
      totalUsers: 31,
      activeBetaTesterCount: 10,
      workoutCount: 2,
      programCount: 1,
      completedSessionCount: 8,
      newUsersLast30Days: 5,
      activeSubscriptions: 1,
      exhaustedBetaCount: 2,
      attentionSubscriptions: 1,
    });
    render(await Overview());
    expect(screen.getByRole('link', { name: /2 accès bêta/ }).getAttribute('href')).toBe(
      '/admin/beta?beta=empty',
    );
  });
  it('offre le réessai après erreur et un état de chargement', () => {
    const reset = vi.fn();
    render(<ErrorPage reset={reset} />);
    fireEvent.click(screen.getByRole('button'));
    expect(reset).toHaveBeenCalledOnce();
    cleanup();
    render(<Loading />);
    expect(screen.getByRole('status')).toBeTruthy();
  });
});
describe('écran de suspension', () => {
  it('conserve la gestion de l’abonnement standard', async () => {
    render(await SuspendedPage());
    expect(screen.getByRole('link', { name: 'Gérer mon abonnement' }).getAttribute('href')).toBe(
      '/abonnement',
    );
    expect(screen.getByRole('button', { name: 'Se déconnecter' })).toBeTruthy();
  });
  it('adapte la page aux accès bêta et redirige après réactivation', async () => {
    auth.auth.mockResolvedValue({ user: { email: member.email, authMethod: 'beta' } });
    render(await SuspendedPage());
    expect(screen.queryByRole('link', { name: 'Gérer mon abonnement' })).toBeNull();
    auth.status.mockResolvedValue({ suspended: false });
    await expect(SuspendedPage()).rejects.toThrow('redirect:/dashboard');
    auth.auth.mockResolvedValue(null);
    await expect(SuspendedPage()).rejects.toThrow('redirect:/login');
  });
});
