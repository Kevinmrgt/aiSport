'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { createHaloBackground, type HaloBackground } from '@/lib/halo-background';
import { createCellsBackground } from '@/lib/cells-background';

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';
function subscribeMotion(callback: () => void) {
  const preference = window.matchMedia(MOTION_QUERY);
  preference.addEventListener('change', callback);
  return () => preference.removeEventListener('change', callback);
}
const getReducedMotion = () => window.matchMedia(MOTION_QUERY).matches;
const getServerMotion = () => true;

export function AnimatedBackground({ variant }: { variant: 'halo' | 'cells' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<HaloBackground | null>(null);
  const reducedMotion = useSyncExternalStore(subscribeMotion, getReducedMotion, getServerMotion);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer =
      variant === 'halo' ? createHaloBackground(canvas) : createCellsBackground(canvas);
    rendererRef.current = renderer;
    return () => {
      renderer?.destroy();
      rendererRef.current = null;
    };
  }, [variant]);

  useEffect(() => {
    rendererRef.current?.setPaused(reducedMotion);
  }, [reducedMotion, variant]);

  return (
    <>
      <div
        aria-hidden="true"
        className={`route-backdrop ${variant === 'halo' ? 'home-halo' : 'route-cells'}`}
        data-background={variant}
      >
        <canvas ref={canvasRef} className="animated-background-canvas" />
      </div>
    </>
  );
}
