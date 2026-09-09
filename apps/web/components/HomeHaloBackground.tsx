'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { createHaloBackground, type HaloBackground } from '@/lib/halo-background';
import { Icon } from '@/components/ui/Icon';

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';
function subscribeMotion(callback: () => void) {
  const preference = window.matchMedia(MOTION_QUERY);
  preference.addEventListener('change', callback);
  return () => preference.removeEventListener('change', callback);
}
const getReducedMotion = () => window.matchMedia(MOTION_QUERY).matches;
const getServerMotion = () => true;

export function HomeHaloBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<HaloBackground | null>(null);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeMotion, getReducedMotion, getServerMotion);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createHaloBackground(canvas);
    rendererRef.current = renderer;
    setReady(Boolean(renderer));
    const onContextLost = () => setReady(false);
    canvas.addEventListener('webglcontextlost', onContextLost);
    return () => {
      canvas.removeEventListener('webglcontextlost', onContextLost);
      renderer?.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.setPaused(paused || reducedMotion);
  }, [paused, reducedMotion]);

  return (
    <>
      <div aria-hidden="true" className="route-backdrop home-halo" data-background="halo">
        <canvas ref={canvasRef} className="home-halo-canvas" />
      </div>
      {ready &&
        !reducedMotion &&
        createPortal(
          <button
            type="button"
            className="background-motion-control"
            aria-label={
              paused ? 'Relancer l’animation du fond' : 'Mettre l’animation du fond en pause'
            }
            onClick={() => setPaused((value) => !value)}
          >
            <Icon name={paused ? 'play' : 'pause'} className="h-4 w-4" />
            <span>Animation</span>
          </button>,
          document.body,
        )}
    </>
  );
}
