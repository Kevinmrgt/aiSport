import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { Exercise, Phase } from '@alcide/shared';
import { WorkoutTimeline } from './WorkoutTimeline';

describe('WorkoutTimeline', () => {
  afterEach(cleanup);

  it('affiche les séries et uniquement les repos réellement prévus', () => {
    render(
      <WorkoutTimeline
        exercises={[
          {
            name: 'Pompes',
            description: 'Contrôle',
            rest_seconds: 30,
            prescription: {
              version: 2,
              category: 'strength',
              mode: 'repetitions',
              sets: 3,
              reps: 10,
              work_seconds: 30,
              rest_seconds: 90,
              transition_seconds: 30,
            },
          },
        ]}
      />,
    );
    expect(screen.getByText('Durée estimée : 5min')).toBeTruthy();
    expect(screen.getByText('Série 3/3 · 10 répétitions')).toBeTruthy();
    expect(screen.getAllByText('Repos : 1m30s')).toHaveLength(2);
    expect(screen.getByText('Installation')).toBeTruthy();
  });

  it('ne rend rien quand la seance est vide', () => {
    const { container } = render(<WorkoutTimeline exercises={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('calcule le chrono et distingue les exercices libres', () => {
    const warmup: Phase[] = [
      { name: 'Mobilite', description: 'Articulations', duration_seconds: 60 },
    ];
    const exercises: Exercise[] = [
      {
        name: 'Course',
        description: 'Allure soutenue',
        duration_seconds: 125,
        rest_seconds: 35,
      },
      {
        name: 'Pompes',
        description: 'Au ressenti',
        sets: 3,
        reps: '10',
        rest_seconds: 0,
      },
    ];
    const cooldown: Phase[] = [
      { name: 'Respiration', description: 'Retour au calme', duration_seconds: 20 },
    ];

    render(<WorkoutTimeline exercises={exercises} warmup={warmup} cooldown={cooldown} />);

    expect(screen.getByRole('group', { name: 'Timeline de 4min' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Exercice · Course · 2m5s' })).toBeTruthy();
    expect(screen.getAllByText('2m5s').some((node) => node.closest('summary'))).toBe(true);
    expect(screen.getByText('3x10')).toBeTruthy();
    expect(screen.getByText('Libre')).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Detail des exercices' }).children).toHaveLength(4);
  });

  const exercises: Exercise[] = [
    {
      name: 'Pompes',
      description: 'Contrôle',
      rest_seconds: 0,
      prescription: {
        version: 2,
        category: 'strength',
        mode: 'repetitions',
        sets: 2,
        reps: 10,
        work_seconds: 30,
        rest_seconds: 90,
        transition_seconds: 20,
      },
    },
    { name: 'Gainage', description: 'Respirez', rest_seconds: 0, duration_seconds: 60 },
  ];

  it('affiche immédiatement le bon exercice, sa série et sa durée estimée au survol', () => {
    render(<WorkoutTimeline exercises={exercises} />);
    expect(screen.queryByRole('tooltip')).toBeNull();
    const buttons = screen.getAllByRole('button');
    fireEvent.pointerEnter(buttons[0]!);
    const tooltip = within(screen.getByRole('tooltip'));
    expect(tooltip.getByText('Pompes')).toBeTruthy();
    expect(tooltip.getByText('Série 1/2 · 10 répétitions')).toBeTruthy();
    expect(tooltip.getByText('≈ 30s · À votre rythme')).toBeTruthy();
    expect(buttons[0]!.getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip').id);
    fireEvent.pointerEnter(buttons[2]!);
    expect(
      within(screen.getByRole('tooltip')).getByText('Série 2/2 · 10 répétitions'),
    ).toBeTruthy();
    fireEvent.pointerEnter(buttons[4]!);
    expect(within(screen.getByRole('tooltip')).getByText('Gainage')).toBeTruthy();
    expect(within(screen.getByRole('tooltip')).getByText('1min')).toBeTruthy();
    fireEvent.pointerLeave(screen.getByRole('group', { name: 'Timeline de 3m50s' }));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('nomme le repos et la préparation sans les confondre avec un exercice', () => {
    render(<WorkoutTimeline exercises={exercises} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.pointerEnter(buttons[1]!);
    expect(within(screen.getByRole('tooltip')).getByText('Repos')).toBeTruthy();
    expect(within(screen.getByRole('tooltip')).getByText('Après Pompes')).toBeTruthy();
    expect(within(screen.getByRole('tooltip')).getByText('Avant la série 2')).toBeTruthy();
    fireEvent.pointerEnter(buttons[3]!);
    expect(within(screen.getByRole('tooltip')).getByText('Installation')).toBeTruthy();
    expect(within(screen.getByRole('tooltip')).getByText('Préparez Gainage')).toBeTruthy();
  });

  it('permet de parcourir les segments au clavier avec une seule entrée Tab et de fermer par Échap', () => {
    render(<WorkoutTimeline exercises={exercises} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.filter((button) => button.tabIndex === 0)).toHaveLength(1);
    act(() => buttons[0]!.focus());
    expect(screen.getByRole('tooltip')).toBeTruthy();
    fireEvent.keyDown(buttons[0]!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(buttons[1]);
    fireEvent.keyDown(buttons[1]!, { key: 'End' });
    expect(document.activeElement).toBe(buttons[4]);
    fireEvent.keyDown(buttons[4]!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(buttons[4]);
    fireEvent.keyDown(buttons[4]!, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(buttons[3]);
    fireEvent.keyDown(buttons[3]!, { key: 'Home' });
    expect(document.activeElement).toBe(buttons[0]);
    fireEvent.keyDown(buttons[0]!, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(buttons[0]);
    fireEvent.keyDown(buttons[0]!, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(document.activeElement).toBe(buttons[0]);
    fireEvent.click(buttons[0]!);
    act(() => buttons[0]!.blur());
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('ouvre au toucher et ferme au toucher extérieur sans modifier le programme', () => {
    render(<WorkoutTimeline exercises={exercises} />);
    const button = screen.getAllByRole('button')[0]!;
    const details = screen.getByRole('list', { name: 'Detail des exercices' }).innerHTML;
    fireEvent.click(button);
    fireEvent.pointerDown(screen.getByRole('tooltip'));
    expect(screen.getByRole('tooltip')).toBeTruthy();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(screen.getByRole('list', { name: 'Detail des exercices' }).innerHTML).toBe(details);
  });

  it('décrit aussi les phases et les exercices sans chrono', () => {
    render(
      <WorkoutTimeline
        exercises={[{ name: 'Étirement libre', description: 'Au choix', rest_seconds: 0 }]}
        warmup={[{ name: 'Mobilité', description: 'Articulations', duration_seconds: 45 }]}
        cooldown={[{ name: 'Respiration', description: 'Relâchez', duration_seconds: 20 }]}
      />,
    );
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]!);
    expect(within(screen.getByRole('tooltip')).getByText('Échauffement')).toBeTruthy();
    expect(within(screen.getByRole('tooltip')).getByText('Mobilité')).toBeTruthy();
    fireEvent.click(buttons[1]!);
    expect(within(screen.getByRole('tooltip')).getByText('À votre rythme')).toBeTruthy();
    fireEvent.click(buttons[2]!);
    expect(within(screen.getByRole('tooltip')).getByText('Retour calme')).toBeTruthy();
    expect(within(screen.getByRole('tooltip')).getByText('Respiration')).toBeTruthy();
  });
});
