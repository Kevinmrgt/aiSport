'use client';

import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import Link from 'next/link';
import type { ProgramWeek } from '@alcide/shared';
import { Icon } from './ui/Icon';

interface ProgramWeekTabsProps {
  weeks: ProgramWeek[];
  programId: string;
}

export function ProgramWeekTabs({ weeks, programId }: ProgramWeekTabsProps) {
  const tabsetId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [activeWeek, setActiveWeek] = useState(() => weeks[0]?.week_number ?? 1);

  const currentWeek = weeks.find((w) => w.week_number === activeWeek) ?? weeks[0];

  if (!currentWeek) return null;

  const activateTab = (index: number) => {
    const week = weeks[index];
    if (!week) return;
    setActiveWeek(week.week_number);
    tabRefs.current[index]?.focus();
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') nextIndex = (index + 1) % weeks.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + weeks.length) % weeks.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = weeks.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      activateTab(nextIndex);
    }
  };

  return (
    <div>
      <nav
        role="tablist"
        aria-orientation="horizontal"
        aria-label="Semaines du programme"
        className="week-tabs"
      >
        {weeks.map((week, index) => (
          <button
            key={week.week_number}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={activeWeek === week.week_number}
            aria-controls={`${tabsetId}-panel-${week.week_number}`}
            id={`${tabsetId}-tab-${week.week_number}`}
            tabIndex={activeWeek === week.week_number ? 0 : -1}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            onClick={() => setActiveWeek(week.week_number)}
          >
            Semaine {week.week_number}
          </button>
        ))}
      </nav>
      {weeks.map((week) => (
        <div
          key={week.week_number}
          role="tabpanel"
          id={`${tabsetId}-panel-${week.week_number}`}
          aria-labelledby={`${tabsetId}-tab-${week.week_number}`}
          tabIndex={activeWeek === week.week_number ? 0 : -1}
          hidden={activeWeek !== week.week_number}
        >
          <div className="mb-7">
            <h3 className="text-2xl font-bold">{week.theme}</h3>
            <p className="muted-copy mt-2">{week.objective}</p>
          </div>
          <ul aria-label={`Seances de la semaine ${week.week_number}`}>
            {week.sessions.map((session) => (
              <li key={session.session_number} role="article" className="week-session">
                <div className="flex min-w-0 flex-1 gap-5">
                  <span className="week-session-number">{session.session_number}</span>
                  <div className="min-w-0">
                    <h3 className="break-words text-xl font-bold">{session.title}</h3>
                    <p className="muted-copy mt-1">{session.focus}</p>
                    <p className="muted-copy mt-2 text-sm">
                      ~{session.duration_minutes} min · {session.exercises.length} exercice
                      {session.exercises.length > 1 ? 's' : ''}
                      {session.warmup?.length ? ' · échauffement inclus' : ''}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/programs/${programId}/sessions/${week.week_number}-${session.session_number}`}
                  aria-label={`Demarrer la seance ${session.session_number} : ${session.title}`}
                  className="action-secondary"
                >
                  Voir la séance <Icon name="arrow-right" className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
