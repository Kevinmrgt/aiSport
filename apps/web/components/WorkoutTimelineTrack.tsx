'use client';

import { useEffect, useId, useRef, useState } from 'react';

interface TimelineSegment {
  id: string;
  label: string;
  phase: string;
  color: string;
  width: string;
  detail: string;
  duration: string;
}

interface WorkoutTimelineTrackProps {
  label: string;
  segments: TimelineSegment[];
}

export function WorkoutTimelineTrack({ label, segments }: WorkoutTimelineTrackProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState<{ id: string; position: number } | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const tooltipId = useId();
  const instructionsId = useId();
  const segment = segments.find((item) => item.id === active?.id);
  const isOpen = Boolean(segment);

  useEffect(() => {
    if (!isOpen) return;
    function dismissOutside(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setActive(null);
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setActive(null);
    }
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, [isOpen]);

  function showSegment(index: number, button: HTMLButtonElement) {
    const bounds = containerRef.current!.getBoundingClientRect();
    const target = button.getBoundingClientRect();
    const position =
      bounds.width > 0 ? ((target.left + target.width / 2 - bounds.left) / bounds.width) * 100 : 50;
    setActive({ id: segments[index]!.id, position });
  }

  return (
    <div
      ref={containerRef}
      className="relative h-3"
      role="group"
      aria-label={label}
      aria-describedby={instructionsId}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'touch') setActive(null);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setActive(null);
      }}
    >
      <p id={instructionsId} className="sr-only">
        Survolez ou touchez un segment pour découvrir l’exercice. Au clavier, utilisez les flèches
        gauche et droite pour parcourir la séance, et Échap pour fermer l’infobulle.
      </p>
      <div className="absolute -top-4 flex h-11 w-full gap-0.5">
        {segments.map((item, index) => (
          <button
            key={item.id}
            ref={(button) => {
              buttonsRef.current[index] = button;
            }}
            type="button"
            className="flex min-w-0 items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100"
            style={{ flexBasis: item.width, flexShrink: 1 }}
            tabIndex={focusIndex === index ? 0 : -1}
            aria-label={[item.phase, item.label, item.detail, item.duration]
              .filter(Boolean)
              .join(' · ')}
            aria-describedby={active?.id === item.id ? tooltipId : undefined}
            onPointerEnter={(event) => {
              if (event.pointerType !== 'touch') showSegment(index, event.currentTarget);
            }}
            onFocus={(event) => {
              setFocusIndex(index);
              showSegment(index, event.currentTarget);
            }}
            onClick={(event) => showSegment(index, event.currentTarget)}
            onKeyDown={(event) => {
              let nextIndex: number;
              switch (event.key) {
                case 'ArrowRight':
                  nextIndex = Math.min(index + 1, segments.length - 1);
                  break;
                case 'ArrowLeft':
                  nextIndex = Math.max(index - 1, 0);
                  break;
                case 'Home':
                  nextIndex = 0;
                  break;
                case 'End':
                  nextIndex = segments.length - 1;
                  break;
                default:
                  return;
              }
              event.preventDefault();
              buttonsRef.current[nextIndex]?.focus();
            }}
          >
            <span
              aria-hidden="true"
              className={`h-3 w-full ${item.color} ${index === 0 ? 'rounded-l-full' : ''} ${index === segments.length - 1 ? 'rounded-r-full' : ''} ${active?.id === item.id ? 'brightness-125 ring-1 ring-inset ring-primary-100' : ''}`}
            />
          </button>
        ))}
      </div>
      {segment && active && (
        <div
          className="absolute bottom-full z-30 w-72 max-w-full pb-5"
          style={{
            left: `clamp(0px, calc(${active.position}% - 9rem), max(0px, calc(100% - 18rem)))`,
          }}
        >
          <div
            id={tooltipId}
            role="tooltip"
            className="rounded-2xl border border-primary-200/40 bg-primary-900/95 px-4 py-3 text-sm text-primary-50 shadow-xl shadow-black/20 backdrop-blur-xl"
          >
            <p className="flex items-center gap-2 text-xs text-primary-200">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${segment.color}`}
                aria-hidden="true"
              />
              {segment.phase}
            </p>
            <p className="mt-1 break-words font-bold">{segment.label}</p>
            {segment.detail && <p className="mt-1 text-xs text-primary-200">{segment.detail}</p>}
            <p className="mt-1 text-xs text-primary-200">{segment.duration}</p>
          </div>
        </div>
      )}
    </div>
  );
}
