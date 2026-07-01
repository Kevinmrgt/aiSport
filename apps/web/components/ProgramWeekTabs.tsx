'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ProgramWeek } from '@alcide/shared';
import { Icon } from './ui/Icon';

interface ProgramWeekTabsProps {
  weeks: ProgramWeek[];
  programId: string;
}

export function ProgramWeekTabs({ weeks, programId }: ProgramWeekTabsProps) {
  const [activeWeek, setActiveWeek] = useState(1);

  const currentWeek = weeks.find((w) => w.week_number === activeWeek) ?? weeks[0];

  if (!currentWeek) return null;

  return (
    <div>
      <nav
        role="tablist"
        aria-label="Semaines du programme"
        className="mb-6 flex gap-2 overflow-x-auto rounded-full border border-white/10 bg-zinc-950/[0.55] p-1"
      >
        {weeks.map((week) => (
          <button
            key={week.week_number}
            type="button"
            role="tab"
            aria-selected={activeWeek === week.week_number}
            aria-controls={`week-panel-${week.week_number}`}
            id={`week-tab-${week.week_number}`}
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

      <div
        role="tabpanel"
        id={`week-panel-${currentWeek.week_number}`}
        aria-labelledby={`week-tab-${currentWeek.week_number}`}
      >
        <div className="mb-5 rounded-[1.8rem] border border-white/10 bg-zinc-950/[0.58] p-4">
          <h2 className="text-2xl font-black text-white">{currentWeek.theme}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-300">{currentWeek.objective}</p>
        </div>

        <ul className="space-y-3" aria-label={`Seances de la semaine ${currentWeek.week_number}`}>
          {currentWeek.sessions.map((session) => {
            const sessionId = `${currentWeek.week_number}-${session.session_number}`;

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
                        {session.exercises.length} exercice{session.exercises.length > 1 ? 's' : ''}
                        {session.warmup && session.warmup.length > 0 ? ' - echauffement inclus' : ''}
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
    </div>
  );
}
