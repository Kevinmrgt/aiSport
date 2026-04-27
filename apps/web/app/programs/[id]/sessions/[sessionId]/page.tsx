import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import { Timer } from '@/components/Timer';
import { WorkoutTimeline } from '@/components/WorkoutTimeline';

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

      {/* Timeline visuelle (échauffement + exercices + récupération) */}
      <section aria-labelledby="timeline-title" className="py-6 border-t border-zinc-100">
        <h2
          id="timeline-title"
          className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-6"
        >
          Programme
        </h2>
        <WorkoutTimeline
          exercises={trainingSession.exercises}
          warmup={trainingSession.warmup}
          cooldown={trainingSession.cooldown}
        />
      </section>

      {/* Timer interactif */}
      <section aria-labelledby="timer-title" className="py-6 border-t border-zinc-100">
        <h2
          id="timer-title"
          className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4"
        >
          Timer
        </h2>
        <Timer exercises={trainingSession.exercises} totalDurationMinutes={trainingSession.duration_minutes} />
      </section>
    </div>
  );
}
