'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ProgramWeek } from '@sportcoach/shared';

interface ProgramWeekTabsProps {
  weeks: ProgramWeek[];
  programId: string;
}

const DIFFICULTY_LABELS = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};

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
        className="flex gap-1 border-b border-zinc-200 mb-6 overflow-x-auto"
      >
        {weeks.map((week) => (
          <button
            key={week.week_number}
            role="tab"
            aria-selected={activeWeek === week.week_number}
            aria-controls={`week-panel-${week.week_number}`}
            id={`week-tab-${week.week_number}`}
            onClick={() => { setActiveWeek(week.week_number); }}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1 ${
              activeWeek === week.week_number
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-700 hover:border-zinc-300'
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
          <h2 className="text-base font-semibold text-zinc-900">
            {currentWeek.theme}
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">{currentWeek.objective}</p>
        </div>

        <ul className="divide-y divide-zinc-100" aria-label={`Séances de la semaine ${currentWeek.week_number}`}>
          {currentWeek.sessions.map((session) => {
            // sessionId : "[weekNumber]-[sessionNumber]" — parsé dans la page de détail
            const sessionId = `${currentWeek.week_number}-${session.session_number}`;

            return (
              <li key={session.session_number} role="article" className="py-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-zinc-900">
                        Séance {session.session_number}
                      </span>
                      <span className="text-xs text-zinc-400">{session.focus}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-zinc-700 truncate">{session.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {session.duration_minutes} min · {session.exercises.length} exercice{session.exercises.length > 1 ? 's' : ''}
                      {session.warmup && session.warmup.length > 0 ? ' · échauffement' : ''}
                    </p>
                  </div>

                  <Link
                    href={`/programs/${programId}/sessions/${sessionId}`}
                    aria-label={`Démarrer la séance ${session.session_number} : ${session.title}`}
                    className="shrink-0 inline-flex items-center justify-center px-4 py-1.5 rounded-md bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
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
