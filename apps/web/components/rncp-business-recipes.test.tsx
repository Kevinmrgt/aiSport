import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/server-api', () => ({
  serverApi: {
    getPrograms: vi.fn(),
    deleteProgram: vi.fn(),
    getStats: vi.fn(),
    getSessionLogStats: vi.fn(),
  },
}));

import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import DashboardPage from '@/app/dashboard/page';
import ProgramsPage from '@/app/programs/page';
import PrivacyPage from '@/app/confidentialite/page';
import { DeleteConfirmationButton } from './DeleteConfirmationButton';
import { SessionCompletionForm } from './SessionCompletionForm';
import { SettingsForm } from './SettingsForm';
import { WorkoutForm } from './WorkoutForm';

const costEstimate = {
  modelLabel: 'GPT-5.4 mini',
  inputTokens: 1_200,
  outputTokens: 1_800,
  totalUsdLabel: '$0.009',
};

describe('recettes UI metier RNCP Bloc 2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-rncp', email: 'rncp@example.test', name: 'Recette RNCP' },
    } as never);
  });

  afterEach(cleanup);

  it('CR-013 annonce la panne OpenAI et laisse le formulaire complet reutilisable', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      error: 'OpenAI est temporairement indisponible. Reessayez plus tard.',
    });
    render(<WorkoutForm onSubmit={onSubmit} costEstimate={costEstimate} />);

    fireEvent.change(screen.getByLabelText(/^sport/i), { target: { value: 'course' } });
    fireEvent.change(screen.getByLabelText(/objectifs/i), {
      target: { value: 'Travailler le rythme' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generer la seance/i }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'OpenAI est temporairement indisponible. Reessayez plus tard.',
    );
    expect(screen.getByLabelText<HTMLInputElement>(/^sport/i).value).toBe('course');
    expect(screen.getByLabelText<HTMLTextAreaElement>(/objectifs/i).value).toBe(
      'Travailler le rythme',
    );
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: /generer la seance/i }).disabled,
    ).toBe(false);
  });

  it('CR-018 affiche la page demandee et les bornes de pagination des programmes', async () => {
    vi.mocked(serverApi.getPrograms).mockResolvedValue({
      programs: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          title: 'Cycle prive du compte',
          sport: 'course',
          difficulty: 'beginner',
          weeksCount: 2,
          sessionsPerWeek: 2,
          sessionDurationMinutes: 30,
          createdAt: '2026-07-21T08:00:00.000Z',
        },
      ],
      total: 10,
      page: 2,
      limit: 9,
      hasMore: false,
    });

    render(await ProgramsPage({ searchParams: Promise.resolve({ page: '2' }) }));

    expect(serverApi.getPrograms).toHaveBeenCalledWith({ page: 2 });
    expect(screen.getByRole('list', { name: '1 programme sur 10' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /voir le programme : cycle prive/i })).toBeTruthy();
    expect(screen.getByText('2 / 2').getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Precedent' }).getAttribute('href')).toBe(
      '/programs?page=1',
    );
    expect(screen.queryByRole('link', { name: 'Suivant' })).toBeNull();
  });

  it.each([
    ["l'entraînement" as const, 'Seance tempo', 'Erreur API seance'],
    ['le programme' as const, 'Cycle tempo', 'Erreur API programme'],
  ])(
    'CR-021/CR-035 garde la confirmation ouverte et annonce l erreur pour %s',
    async (itemType, itemLabel, errorMessage) => {
      const onDelete = vi.fn().mockResolvedValue({ error: errorMessage });
      render(
        <DeleteConfirmationButton
          id="objet-rncp"
          itemLabel={itemLabel}
          itemType={itemType}
          onDelete={onDelete}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /supprimer/i }));
      const confirm = screen.getByRole('button', { name: 'Confirmer' });
      await waitFor(() => expect(document.activeElement).toBe(confirm));
      fireEvent.click(confirm);

      expect((await screen.findByRole('alert')).textContent).toContain(errorMessage);
      expect(screen.getByRole('group')).toBeTruthy();
      expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Annuler' }).disabled).toBe(
        false,
      );
    },
  );

  it('CR-030/CR-034 transmet la duree active et une note de douleur facultative', async () => {
    const completeAction = vi.fn().mockResolvedValue(undefined);
    render(
      <SessionCompletionForm
        sessionMeta={{
          sourceType: 'workout',
          workoutId: '22222222-2222-4222-8222-222222222222',
          title: 'Fractionne controle',
          sport: 'course',
          difficulty: 'intermediate',
          plannedDurationMinutes: 30,
        }}
        durationSeconds={487}
        completeAction={completeAction}
      />,
    );

    fireEvent.click(screen.getByLabelText('7'));
    fireEvent.click(screen.getByLabelText('Bien dose'));
    fireEvent.change(screen.getByLabelText(/douleur eventuelle/i), {
      target: { value: '  Gene legere au genou gauche  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enregistrer le retour/i }));

    await waitFor(() =>
      expect(completeAction).toHaveBeenCalledWith(
        expect.objectContaining({
          durationSeconds: 487,
          perceivedEffort: 7,
          feedback: 'good',
          painNotes: 'Gene legere au genou gauche',
        }),
      ),
    );
    expect(await screen.findByText('Retour enregistre.')).toBeTruthy();
  });

  it('CR-034 informe que la note de douleur est sensible, facultative et hors flux OpenAI', () => {
    render(<PrivacyPage />);

    const pageText = document.body.textContent
      ?.normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase('fr-FR');
    expect(screen.getByRole('heading', { name: 'Notes de douleur' })).toBeTruthy();
    expect(screen.getByText(/sa saisie est facultative/i)).toBeTruthy();
    expect(pageText).toContain('les notes de suivi ne sont pas envoyees a openai');
    expect(screen.getByText(/ne remplace ni un diagnostic/i)).toBeTruthy();
  });

  it('CR-037 change le modele autorise et confirme sa sauvegarde', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <SettingsForm
        initial={{ provider: 'openai', hasApiKey: false, model: 'gpt-5.4-mini' }}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText('Modele OpenAI'), { target: { value: 'gpt-5.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ model: 'gpt-5.5' }));
    expect((await screen.findByRole('status')).textContent).toContain('Parametres sauvegardes.');
  });

  it('CR-040 affiche un etat vide comprehensible sans journal ni seance', async () => {
    vi.mocked(serverApi.getStats).mockResolvedValue({
      total: 0,
      bySport: {},
      byLevel: { beginner: 0, intermediate: 0, advanced: 0 },
      lastGenerated: null,
    });
    vi.mocked(serverApi.getSessionLogStats).mockResolvedValue({
      totalCompleted: 0,
      totalDurationSeconds: 0,
      averageEffort: null,
      feedbackCounts: { too_easy: 0, good: 0, too_hard: 0 },
      lastCompletedAt: null,
    });

    render(await DashboardPage());

    expect(screen.getByRole('heading', { name: 'Aucune activite encore' })).toBeTruthy();
    expect(screen.getByText(/creez une premiere seance pour activer le dashboard/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Commencer' }).getAttribute('href')).toBe('/generate');
  });

  it('CR-041 affiche les totaux, la duree, l effort et les feedbacks exacts', async () => {
    vi.mocked(serverApi.getStats).mockResolvedValue({
      total: 4,
      bySport: { 'course a pied': 1, ' Course a pied ': 2, yoga: 1 },
      byLevel: { beginner: 1, intermediate: 3, advanced: 0 },
      lastGenerated: '2026-07-21T08:00:00.000Z',
    });
    vi.mocked(serverApi.getSessionLogStats).mockResolvedValue({
      totalCompleted: 3,
      totalDurationSeconds: 5_400,
      averageEffort: 6.5,
      feedbackCounts: { too_easy: 1, good: 2, too_hard: 0 },
      lastCompletedAt: '2026-07-21T09:00:00.000Z',
    });

    render(await DashboardPage());

    const values = screen.getAllByRole('definition').map((node) => node.textContent);
    expect(values).toEqual(expect.arrayContaining(['4', '3', '1 h 30', '6.5 / 10']));
    expect(screen.getByText('course a pied').nextElementSibling?.textContent).toContain('3');
    const intermediateRow = screen
      .getAllByText('Intermediaire')
      .find((node) => node.tagName === 'DT');
    expect(intermediateRow?.nextElementSibling?.textContent).toContain('3');
    expect(screen.getByRole('img', { name: 'effort: 65%' })).toBeTruthy();
  });
});
