import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import { Timer } from '@/components/Timer';

interface SessionPageProps {
  params: { id: string; sessionId: string };
}

// OWASP A01: route protégée + ownership vérifié côté backend
export default async function ProgramSessionPage({ params }: SessionPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Parse sessionId : "${weekNumber}-${sessionNumber}" (ex: "2-1")
  const parts = params.sessionId.split('-');
  const weekNumber = parseInt(parts[0] ?? '', 10);
  const sessionNumber = parseInt(parts[1] ?? '', 10);

  if (isNaN(weekNumber) || isNaN(sessionNumber)) {
    notFound();
  }

  let program: Awaited<ReturnType<typeof serverApi.getProgram>>;
  try {
    program = await serverApi.getProgram(params.id);
  } catch {
    notFound();
  }

  const week = program.data.weeks.find((w) => w.week_number === weekNumber);
  if (!week) notFound();

  const trainingSession = week.sessions.find((s) => s.session_number === sessionNumber);
  if (!trainingSession) notFound();

  return (
    <div className="max-w-2xl mx-auto">
      {/* RGAA 4.1: lien de retour */}
      <nav aria-label="Retour" className="mb-8">
        <Link
          href={`/programs/${params.id}`}
          className="text-sm text-zinc-400 hover:text-zinc-900 transition-colors focus-visible:outline-none focus-visible:underline"
        >
          ← {program.title}
        </Link>
      </nav>

      {/* En-tête */}
      <header className="mb-8">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">
          Semaine {weekNumber} · {week.theme}
        </p>
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">
          Séance {sessionNumber} — {trainingSession.title}
        </h1>
        <p className="text-sm text-zinc-400">
          {trainingSession.focus} · {trainingSession.duration_minutes} min ·{' '}
          {trainingSession.exercises.length} exercice{trainingSession.exercises.length > 1 ? 's' : ''}
        </p>
      </header>

      {/* Échauffement */}
      {trainingSession.warmup && trainingSession.warmup.length > 0 && (
        <section aria-labelledby="warmup-title" className="py-6 border-t border-zinc-100">
          <h2
            id="warmup-title"
            className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4"
          >
            Échauffement
          </h2>
          <ul className="space-y-3">
            {trainingSession.warmup.map((phase, i) => (
              <li key={i} className="text-sm text-zinc-600">
                <span className="font-medium text-zinc-900">{phase.name}</span>
                {' — '}{Math.round(phase.duration_seconds / 60)} min
                {phase.description && (
                  <span className="text-zinc-400"> · {phase.description}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Timer principal */}
      <section aria-labelledby="timer-title" className="py-6 border-t border-zinc-100">
        <h2
          id="timer-title"
          className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4"
        >
          Programme — {trainingSession.exercises.length} exercice{trainingSession.exercises.length > 1 ? 's' : ''}
        </h2>
        <Timer exercises={trainingSession.exercises} totalDurationMinutes={trainingSession.duration_minutes} />
      </section>

      {/* Récupération */}
      {trainingSession.cooldown && trainingSession.cooldown.length > 0 && (
        <section aria-labelledby="cooldown-title" className="py-6 border-t border-zinc-100">
          <h2
            id="cooldown-title"
            className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4"
          >
            Récupération
          </h2>
          <ul className="space-y-3">
            {trainingSession.cooldown.map((phase, i) => (
              <li key={i} className="text-sm text-zinc-600">
                <span className="font-medium text-zinc-900">{phase.name}</span>
                {' — '}{Math.round(phase.duration_seconds / 60)} min
                {phase.description && (
                  <span className="text-zinc-400"> · {phase.description}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
