'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ProgramWeek } from '@sportcoach/shared';

interface ProgramWeekTabsProps {
  weeks: ProgramWeek[];
  programId: string;
}

// RGAA 4.1: navigation tabs accessible (aria-tablist / aria-selected / aria-controls)
export function ProgramWeekTabs({ weeks, programId }: ProgramWeekTabsProps) {
  const [activeWeek, setActiveWeek] = useState(1);

  const currentWeek = weeks.find((w) => w.week_number === activeWeek) ?? weeks[0];

  if (!currentWeek) return null;

  return (
    <div>
      {/* Navigation par semaine — RGAA 4.1: tablist avec aria-selected */}
      <nav
        role="tablist"
        aria-label="Semaines du programme"
        className="mb-6 flex flex-wrap gap-2 rounded-lg border border-white/10 bg-zinc-950/70 p-1"
      >
        {weeks.map((week) => (
          <button
            key={week.week_number}
            role="tab"
            aria-selected={activeWeek === week.week_number}
            aria-controls={`week-panel-${week.week_number}`}
            id={`week-tab-${week.week_number}`}
            onClick={() => { setActiveWeek(week.week_number); }}
            className={`whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300 ${
              activeWeek === week.week_number
                ? 'bg-primary-300 text-zinc-950'
                : 'text-zinc-400 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            Sem. {week.week_number}
          </button>
        ))}
      </nav>

      {/* Contenu de la semaine active — RGAA 4.1: tabpanel */}
      <div
        role="tabpanel"
        id={`week-panel-${currentWeek.week_number}`}
        aria-labelledby={`week-tab-${currentWeek.week_number}`}
      >
        <div className="mb-4">
          <h2 className="text-xl font-black text-white">
            {currentWeek.theme}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">{currentWeek.objective}</p>
        </div>

        <ul className="space-y-3" aria-label={`Séances de la semaine ${currentWeek.week_number}`}>
          {currentWeek.sessions.map((session) => {
            // sessionId : "[weekNumber]-[sessionNumber]" — parsé dans la page de détail
            const sessionId = `${currentWeek.week_number}-${session.session_number}`;

            return (
              <li key={session.session_number} role="article" className="min-w-0 rounded-lg border border-white/10 bg-zinc-950/60 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-sm font-black text-white">
                        Séance {session.session_number}
                      </span>
                      <span className="min-w-0 break-words text-xs text-primary-300">{session.focus}</span>
                    </div>
                    <p className="mt-0.5 break-words text-sm text-zinc-300">{session.title}</p>
                    <p className="mt-0.5 break-words text-xs leading-5 text-zinc-400">
                      {session.duration_minutes} min · {session.exercises.length} exercice{session.exercises.length > 1 ? 's' : ''}
                      {session.warmup && session.warmup.length > 0 ? ' · échauffement' : ''}
                    </p>
                  </div>

                  <Link
                    href={`/programs/${programId}/sessions/${sessionId}`}
                    aria-label={`Démarrer la séance ${session.session_number} : ${session.title}`}
                    className="inline-flex w-full shrink-0 items-center justify-center rounded-full bg-primary-300 px-4 py-1.5 text-xs font-black text-zinc-950 transition-colors hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-300 sm:w-auto"
                  >
                    Démarrer
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
