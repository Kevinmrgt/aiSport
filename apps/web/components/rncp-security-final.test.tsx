import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkoutCard } from './WorkoutCard';

describe('RNCP final XSS rendering recipe', () => {
  afterEach(cleanup);

  it('CR-043 renders hostile persisted values as inert text', () => {
    const xssTitle = '<script>document.body.dataset.rncpXss="executed"</script>';
    const xssSport = '<img src=x onerror="document.body.dataset.rncpXss=executed">';

    const { container } = render(
      <ul>
        <WorkoutCard
          workout={{
            id: 'rncp-xss-proof',
            title: xssTitle,
            sport: xssSport,
            difficulty: 'beginner',
            durationMinutes: 30,
            createdAt: '2026-07-21T00:00:00.000Z',
          }}
          onDelete={vi.fn()}
        />
      </ul>,
    );

    // OWASP: A03 — React text interpolation escapes persisted values at the rendering sink.
    expect(screen.getByText(xssTitle)).toBeTruthy();
    expect(screen.getByText(xssSport)).toBeTruthy();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img[src="x"]')).toBeNull();
    expect(document.body.dataset['rncpXss']).toBeUndefined();
    expect(container.innerHTML).toContain('&lt;script&gt;');
    expect(container.innerHTML).toContain('&lt;img');
  });
});
