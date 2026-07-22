import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProgramForm } from './ProgramForm';
import { SessionCompletionForm } from './SessionCompletionForm';
import { SettingsForm } from './SettingsForm';
import { WorkoutForm } from './WorkoutForm';
import type { SessionCompletionPayload } from './SessionCompletionForm';

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

  it('affiche l erreur metier renvoyee pendant une generation de programme', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: 'Service IA indisponible' });
    render(<ProgramForm onSubmit={onSubmit} />);

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
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ model: 'gpt-5.4' }));
    expect((await screen.findByRole('status')).textContent).toContain('Parametres sauvegardes');
  });
});
