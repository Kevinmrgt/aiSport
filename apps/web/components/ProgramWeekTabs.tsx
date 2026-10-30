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
        className="mb-6 flex gap-2 overflow-x-auto rounded-full border border-white/10 bg-zinc-950/[0.55] p-1"
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
            onClick={() => {
              setActiveWeek(week.week_number);
            }}
            className={`whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-black transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300 ${
              activeWeek === week.week_number
                ? 'bg-primary-300 text-zinc-950 shadow-lg shadow-primary-400/20'
                : 'text-zinc-300 hover:bg-zinc-950/[0.52] hover:text-white'
            }`}
          >
            Sem. {week.week_number}
          </button>
        ))}
      </nav>

      {weeks.map((week) => {
        const isActive = activeWeek === week.week_number;

        return (
          <div
            key={week.week_number}
            role="tabpanel"
            id={`${tabsetId}-panel-${week.week_number}`}
            aria-labelledby={`${tabsetId}-tab-${week.week_number}`}
            tabIndex={isActive ? 0 : -1}
            hidden={!isActive}
          >
            <div className="mb-5 rounded-[1.8rem] border border-white/10 bg-zinc-950/[0.58] p-4">
              <h2 className="text-2xl font-black text-white">{week.theme}</h2>
              <p className="mt-1 text-sm leading-6 text-zinc-300">{week.objective}</p>
            </div>

            <ul className="space-y-3" aria-label={`Seances de la semaine ${week.week_number}`}>
              {week.sessions.map((session) => {
                const sessionId = `${week.week_number}-${session.session_number}`;

                return (
                  <li
                    key={session.session_number}
                    role="article"
                    className="rounded-[1.6rem] border border-white/10 bg-zinc-950/[0.45] p-4 shadow-lg shadow-black/20"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-300 text-sm font-black text-zinc-950">
                          {session.session_number}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="premium-chip">{session.focus}</span>
                            <span className="premium-chip">{session.duration_minutes} min</span>
                          </div>
                          <p className="mt-2 break-words text-base font-black text-white">
                            {session.title}
                          </p>
                          <p className="mt-1 break-words text-xs leading-5 text-zinc-300">
                            {session.exercises.length} exercice
                            {session.exercises.length > 1 ? 's' : ''}
                            {session.warmup && session.warmup.length > 0
                              ? ' - echauffement inclus'
                              : ''}
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/programs/${programId}/sessions/${sessionId}`}
                        aria-label={`Demarrer la seance ${session.session_number} : ${session.title}`}
                        className="action-primary w-full min-h-11 px-4 py-2 text-xs sm:w-auto"
                      >
                        <Icon name="timer" className="h-4 w-4" />
                        Demarrer
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
