import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeHaloBackground } from './HomeHaloBackground';
import { AnimatedBackground } from './AnimatedBackground';
import { RouteBackdrop } from './RouteBackdrop';

const { createBackground, createCells, setPaused, destroy, pathname } = vi.hoisted(() => ({
  createBackground: vi.fn(),
  createCells: vi.fn(),
  setPaused: vi.fn(),
  destroy: vi.fn(),
  pathname: vi.fn(),
}));
vi.mock('@/lib/halo-background', () => ({ createHaloBackground: createBackground }));
vi.mock('@/lib/cells-background', () => ({ createCellsBackground: createCells }));
vi.mock('next/navigation', () => ({ usePathname: pathname }));

describe.each(['halo', 'cells'] as const)('animation décorative %s', (variant) => {
  const factory = variant === 'halo' ? createBackground : createCells;
  const Background = () =>
    variant === 'halo' ? <HomeHaloBackground /> : <AnimatedBackground variant="cells" />;
  let reduce = false;
  let preferenceChanged: () => void;
  beforeEach(() => {
    vi.clearAllMocks();
    reduce = false;
    createBackground.mockReturnValue({ setPaused, destroy });
    createCells.mockReturnValue({ setPaused, destroy });
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
    const { container, unmount } = render(<Background />);
    expect(container.querySelector('canvas')?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(setPaused).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByRole('button', { name: 'Mettre l’animation du fond en pause' }));
    expect(setPaused).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Relancer l’animation du fond' }));
    expect(setPaused).toHaveBeenLastCalledWith(false);
    expect(factory).toHaveBeenCalledTimes(1);
    unmount();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('respecte la préférence de mouvement réduit et ses changements', () => {
    reduce = true;
    render(<Background />);
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
    factory.mockReturnValue(null);
    const { container } = render(<Background />);
    expect(container.querySelector(`[data-background="${variant}"]`)).not.toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('retire le contrôle après une perte du contexte graphique', () => {
    const { container } = render(<Background />);
    fireEvent(container.querySelector('canvas')!, new Event('webglcontextlost'));
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('nettoie l’ancien moteur en quittant l’accueil et garde Cells entre les pages', () => {
    pathname.mockReturnValue('/');
    const { container, rerender } = render(<RouteBackdrop />);
    expect(createBackground).toHaveBeenCalledTimes(1);
    pathname.mockReturnValue('/dashboard');
    rerender(<RouteBackdrop />);
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(createCells).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Mettre l’animation du fond en pause' }));
    pathname.mockReturnValue('/settings');
    rerender(<RouteBackdrop />);
    expect(createCells).toHaveBeenCalledTimes(1);
    expect(setPaused).toHaveBeenLastCalledWith(true);
    expect(container.querySelectorAll('canvas')).toHaveLength(1);
    pathname.mockReturnValue('/');
    rerender(<RouteBackdrop />);
    expect(destroy).toHaveBeenCalledTimes(2);
    expect(createBackground).toHaveBeenCalledTimes(2);
    expect(container.querySelectorAll('canvas')).toHaveLength(1);
  });
});
