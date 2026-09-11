'use client';

import { useEffect, useId, useRef } from 'react';
import type { SessionStep } from '@alcide/shared';
import { Icon } from './ui/Icon';

interface TimerTimelineProps {
  steps: SessionStep[];
  currentIndex: number;
}

const PHASE_LABELS: Record<SessionStep['type'], string> = {
  warmup: 'Échauffement',
  exercise: 'Exercice',
  rest: 'Repos',
  transition: 'Installation',
  cooldown: 'Retour au calme',
};

function durationLabel(step: SessionStep): string {
  if (step.durationSeconds === null) return step.reps ? `${step.reps} rép.` : 'À votre rythme';
  const minutes = Math.floor(step.durationSeconds / 60);
  const seconds = step.durationSeconds % 60;
  return minutes > 0 ? `${minutes} min${seconds > 0 ? ` ${seconds} s` : ''}` : `${seconds} s`;
}

export function TimerTimeline({ steps, currentIndex }: TimerTimelineProps) {
  const headingId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const viewport = scrollRef.current;
    const current = currentRef.current;
    if (!viewport || !current) return;
    const keepCurrentVisible = () => {
      const viewportBounds = viewport.getBoundingClientRect();
      const currentBounds = current.getBoundingClientRect();
      if (currentBounds.top < viewportBounds.top || currentBounds.bottom > viewportBounds.bottom) {
        // Scroll only this list: the timer and keyboard focus must stay in place.
        viewport.scrollTop +=
          currentBounds.top -
          viewportBounds.top -
          (viewport.clientHeight - currentBounds.height) / 2;
      }
    };
    keepCurrentVisible();
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(keepCurrentVisible);
    observer?.observe(viewport);
    return () => observer?.disconnect();
  }, [currentIndex]);

  return (
    <aside className="timer-timeline" aria-labelledby={headingId}>
      <div className="timer-timeline-heading">
        <h3 id={headingId}>Votre séance</h3>
        <p aria-live="polite" aria-atomic="true">
          Étape {currentIndex + 1} sur {steps.length}
        </p>
      </div>
      <div
        ref={scrollRef}
        className="timer-timeline-scroll"
        role="region"
        aria-label="Étapes de la séance"
        tabIndex={0}
      >
        <ol className="timer-timeline-list">
          {steps.map((step, index) => {
            const isCurrent = index === currentIndex;
            const isPast = index < currentIndex;
            const status = isCurrent ? 'En cours' : isPast ? 'Passée' : 'À venir';
            const title =
              step.type === 'transition' ? (step.description ?? step.title) : step.title;
            const series =
              step.setNumber !== undefined
                ? `${step.circuitId ? 'Tour' : 'Série'} ${step.setNumber}/${step.sets}`
                : undefined;
            return (
              <li
                key={step.id}
                ref={isCurrent ? currentRef : undefined}
                aria-current={isCurrent ? 'step' : undefined}
                className={`timer-timeline-item ${isPast ? 'is-past' : ''}`}
              >
                <span className="timer-timeline-marker" aria-hidden="true">
                  {isPast ? (
                    <Icon name="check" className="h-3 w-3" />
                  ) : isCurrent ? (
                    <span />
                  ) : (
                    index + 1
                  )}
                </span>
                <div className="timer-timeline-card">
                  <div className="timer-timeline-meta">
                    <span>{PHASE_LABELS[step.type]}</span>
                    <span className={isCurrent ? 'timer-timeline-current-label' : 'sr-only'}>
                      {status}
                    </span>
                  </div>
                  <p className="timer-timeline-name">{title}</p>
                  <p className="timer-timeline-detail">
                    {series ? `${series} · ` : ''}
                    {durationLabel(step)}
                  </p>
                  {step.type === 'rest' && step.description && (
                    <p className="timer-timeline-detail">{step.description}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}
