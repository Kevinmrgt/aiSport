import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeHaloBackground } from './HomeHaloBackground';

const { createBackground, setPaused, destroy } = vi.hoisted(() => ({
  createBackground: vi.fn(),
  setPaused: vi.fn(),
  destroy: vi.fn(),
}));
vi.mock('@/lib/halo-background', () => ({ createHaloBackground: createBackground }));

describe('animation décorative de l’accueil', () => {
  let reduce = false;
  let preferenceChanged: () => void;
  beforeEach(() => {
    vi.clearAllMocks();
    reduce = false;
    createBackground.mockReturnValue({ setPaused, destroy });
    vi.stubGlobal('matchMedia', () => ({
      matches: reduce,
      addEventListener: (_: string, listener: () => void) => {
        preferenceChanged = listener;
      },
      removeEventListener: vi.fn(),
    }));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('permet de mettre en pause et relancer le fond sans le recréer', () => {
    const { container, unmount } = render(<HomeHaloBackground />);
    expect(container.querySelector('canvas')?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(setPaused).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByRole('button', { name: 'Mettre l’animation du fond en pause' }));
    expect(setPaused).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Relancer l’animation du fond' }));
    expect(setPaused).toHaveBeenLastCalledWith(false);
    expect(createBackground).toHaveBeenCalledTimes(1);
    unmount();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('respecte la préférence de mouvement réduit et ses changements', () => {
    reduce = true;
    render(<HomeHaloBackground />);
    expect(setPaused).toHaveBeenLastCalledWith(true);
    expect(screen.queryByRole('button')).toBeNull();
    act(() => {
      reduce = false;
      preferenceChanged();
    });
    expect(setPaused).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('button')).toBeTruthy();
    act(() => {
      reduce = true;
      preferenceChanged();
    });
    expect(setPaused).toHaveBeenLastCalledWith(true);
  });

  it('garde le fond statique sans contrôle inactif lorsque WebGL est indisponible', () => {
    createBackground.mockReturnValue(null);
    const { container } = render(<HomeHaloBackground />);
    expect(container.querySelector('[data-background="halo"]')).not.toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('retire le contrôle après une perte du contexte graphique', () => {
    const { container } = render(<HomeHaloBackground />);
    fireEvent(container.querySelector('canvas')!, new Event('webglcontextlost'));
    expect(screen.queryByRole('button')).toBeNull();
  });
});
