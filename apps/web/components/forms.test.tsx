import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProgramForm } from './ProgramForm';
import { SessionCompletionForm } from './SessionCompletionForm';
import { SettingsForm } from './SettingsForm';
import { WorkoutForm } from './WorkoutForm';
import type { SessionCompletionPayload } from './SessionCompletionForm';

const unlimitedQuota = { limited: false, limit: null, used: 0, remaining: null } as const;
const juryQuota = { limited: true, limit: 30, used: 12, remaining: 18 } as const;

describe('formulaires metier', () => {
  afterEach(cleanup);

  it('bloque une generation de seance invalide puis soumet les donnees valides', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <WorkoutForm
        onSubmit={onSubmit}
        costEstimate={{
          modelLabel: 'GPT-5.4 mini',
          inputTokens: 1_200,
          outputTokens: 1_800,
          totalUsdLabel: '$0.009',
        }}
        generationQuota={unlimitedQuota}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /generer la seance/i }));
    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByLabelText(/sport/i));

    fireEvent.change(screen.getByLabelText(/sport/i), { target: { value: 'course' } });
    fireEvent.change(screen.getByLabelText(/objectifs/i), {
      target: { value: 'Ameliorer mon endurance' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generer la seance/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          sport: 'course',
          goals: 'Ameliorer mon endurance',
          level: 'beginner',
          duration_minutes: 30,
        }),
      ),
    );
  });

  it('ne transforme pas une redirection Next reussie en alerte metier', async () => {
    const redirectError = Object.assign(new Error('NEXT_REDIRECT'), {
      digest: 'NEXT_REDIRECT;push;/workouts/workout-1;303;',
    });
    const onSubmit = vi.fn().mockRejectedValue(redirectError);
    render(
      <WorkoutForm
        onSubmit={onSubmit}
        costEstimate={{
          modelLabel: 'GPT-5.4 mini',
          inputTokens: 1_200,
          outputTokens: 1_800,
          totalUsdLabel: '$0.009',
        }}
        generationQuota={unlimitedQuota}
      />,
    );

    fireEvent.change(screen.getByLabelText(/sport/i), { target: { value: 'course' } });
    fireEvent.change(screen.getByLabelText(/objectifs/i), {
      target: { value: 'Ameliorer mon endurance' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generer la seance/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('ne transforme pas une redirection Next de programme en alerte metier', async () => {
    const redirectError = Object.assign(new Error('NEXT_REDIRECT'), {
      digest: 'NEXT_REDIRECT;push;/programs/program-1;303;',
    });
    const onSubmit = vi.fn().mockRejectedValue(redirectError);
    render(<ProgramForm onSubmit={onSubmit} generationQuota={unlimitedQuota} />);

    fireEvent.change(screen.getByLabelText(/^sport/i), {
      target: { value: 'course' },
    });
    fireEvent.change(screen.getByLabelText(/objectifs/i), {
      target: { value: 'Preparer une course' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generer le programme/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('affiche l erreur metier renvoyee pendant une generation de programme', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: 'Service IA indisponible' });
    render(<ProgramForm onSubmit={onSubmit} generationQuota={unlimitedQuota} />);

    fireEvent.click(screen.getByRole('button', { name: /generer le programme/i }));
    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
    expect(document.activeElement).toBe(screen.getByLabelText(/^sport/i));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/^sport/i), { target: { value: 'natation' } });
    fireEvent.change(screen.getByLabelText(/objectifs/i), {
      target: { value: 'Preparer une competition' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generer le programme/i }));

    expect((await screen.findByRole('alert')).textContent).toContain('Service IA indisponible');
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ sport: 'natation', weeks_count: 3, sessions_per_week: 3 }),
    );
  });

  it('affiche le solde commun du jury et bloque les generations lorsque le quota est atteint', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<ProgramForm onSubmit={onSubmit} generationQuota={juryQuota} />);

    expect(screen.getByRole('status').textContent).toContain('18 generations restantes sur 30');
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: /generer le programme/i }).disabled,
    ).toBe(false);

    rerender(
      <ProgramForm
        onSubmit={onSubmit}
        generationQuota={{ limited: true, limit: 30, used: 30, remaining: 0 }}
      />,
    );

    expect(screen.getByRole('alert').textContent).toContain('0 generations restantes sur 30');
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: /quota jury atteint/i }).disabled,
    ).toBe(true);
  });

  it('enregistre un ressenti en normalisant les notes optionnelles', async () => {
    const completeAction = vi
      .fn<(payload: SessionCompletionPayload) => Promise<void>>()
      .mockResolvedValue(undefined);
    render(
      <SessionCompletionForm
        sessionMeta={{
          sourceType: 'workout',
          workoutId: 'workout-1',
          title: 'Fractionne',
          sport: 'course',
          difficulty: 'intermediate',
          plannedDurationMinutes: 30,
        }}
        durationSeconds={1_200}
        completeAction={completeAction}
      />,
    );

    fireEvent.click(screen.getByLabelText('8'));
    fireEvent.click(screen.getByLabelText('Trop dur'));
    fireEvent.change(screen.getByLabelText(/douleur/i), { target: { value: '  Genou  ' } });
    fireEvent.change(screen.getByLabelText(/^notes$/i), { target: { value: '  Ralentir  ' } });
    fireEvent.click(screen.getByRole('button', { name: /enregistrer le retour/i }));

    await waitFor(() =>
      expect(completeAction).toHaveBeenCalledWith(
        expect.objectContaining({
          durationSeconds: 1_200,
          perceivedEffort: 8,
          feedback: 'too_hard',
          painNotes: 'Genou',
          notes: 'Ralentir',
        }),
      ),
    );
    const submitted = completeAction.mock.calls[0]?.[0];
    expect(submitted?.completedAt).toBeTruthy();
    expect(Number.isNaN(Date.parse(submitted?.completedAt ?? ''))).toBe(false);
    expect((await screen.findByRole('status')).textContent).toContain('Retour enregistre');
  });

  it('sauvegarde un changement de modele et confirme le succes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <SettingsForm
        initial={{ provider: 'openai', hasApiKey: true, model: 'gpt-5.4-mini' }}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText('Modele OpenAI'), { target: { value: 'gpt-5.4' } });
    const saveButton = screen.getByRole('button', { name: 'Enregistrer' });
    saveButton.focus();
    fireEvent.click(saveButton);

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ model: 'gpt-5.4' }));
    const status = await screen.findByRole('status');
    expect(status.textContent).toContain('Parametres sauvegardes');
    expect(document.activeElement).toBe(saveButton);
  });
});
