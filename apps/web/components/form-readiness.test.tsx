import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, render, screen } from '@testing-library/react';
import { WorkoutForm } from './WorkoutForm';
import { ProgramForm } from './ProgramForm';
import { SessionCompletionForm } from './SessionCompletionForm';

const quota = { limited: false, limit: null, used: 0, remaining: null } as const;

describe('soumission avant hydratation', () => {
  afterEach(cleanup);

  it.each([
    ['séance', <WorkoutForm key="workout" generationQuota={quota} onSubmit={vi.fn()} />],
    ['programme', <ProgramForm key="program" generationQuota={quota} onSubmit={vi.fn()} />],
    [
      'bilan',
      <SessionCompletionForm
        key="completion"
        durationSeconds={60}
        completeAction={vi.fn()}
        sessionMeta={{
          sourceType: 'workout',
          workoutId: '10000000-0000-4000-8000-000000000001',
          title: 'Test',
          sport: 'course',
          difficulty: 'beginner',
          plannedDurationMinutes: 20,
        }}
      />,
    ],
  ])('protège le formulaire %s jusqu’à ce que ses handlers soient prêts', (_, element) => {
    const document = new DOMParser().parseFromString(renderToStaticMarkup(element), 'text/html');
    expect(document.querySelector('form')?.getAttribute('method')).toBe('post');
    expect(document.querySelector('fieldset')?.disabled).toBe(true);
    expect(document.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(true);
    render(element);
    expect(screen.getByRole<HTMLButtonElement>('button').disabled).toBe(false);
  });
});
