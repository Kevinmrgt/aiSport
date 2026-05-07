import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import { Timer } from '@/components/Timer';
import { WorkoutTimeline } from '@/components/WorkoutTimeline';
import type { CreateSessionLogInput } from '@sportcoach/shared';

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

  const sessionMeta = {
    sourceType: 'program_session',
    programId: program.id,
    programWeekNumber: weekNumber,
    programSessionNumber: sessionNumber,
    title: trainingSession.title,
    sport: program.sport,
    difficulty: program.difficulty,
    plannedDurationMinutes: trainingSession.duration_minutes,
  } as const;

  async function completeProgramSession(payload: CreateSessionLogInput): Promise<{ error?: string } | void> {
    'use server';
    try {
      await serverApi.createSessionLog({
        ...sessionMeta,
        durationSeconds: payload.durationSeconds,
        perceivedEffort: payload.perceivedEffort,
        feedback: payload.feedback,
        completedAt: payload.completedAt,
        ...(payload.painNotes ? { painNotes: payload.painNotes } : {}),
        ...(payload.notes ? { notes: payload.notes } : {}),
      });
      revalidatePath('/dashboard');
      revalidatePath(`/programs/${params.id}`);
      revalidatePath(`/programs/${params.id}/sessions/${params.sessionId}`);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Impossible d'enregistrer la seance",
      };
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* RGAA 4.1: lien de retour */}
      <nav aria-label="Retour" className="mb-8">
        <Link
          href={`/programs/${params.id}`}
          className="text-sm font-semibold text-zinc-400 transition-colors hover:text-primary-300 focus-visible:outline-none focus-visible:underline"
        >
          {program.title}
        </Link>
      </nav>

      {/* En-tête */}
      <header className="surface mb-6 p-5 sm:p-6">
        <p className="section-kicker mb-2">
          Semaine {weekNumber} · {week.theme}
        </p>
        <h1 className="page-title">
          Séance {sessionNumber} — {trainingSession.title}
        </h1>
        <p className="mt-3 break-words text-sm leading-5 text-zinc-400">
          {trainingSession.focus} · {trainingSession.duration_minutes} min ·{' '}
          {trainingSession.exercises.length} exercice{trainingSession.exercises.length > 1 ? 's' : ''}
        </p>
      </header>

      {/* Timeline visuelle (échauffement + exercices + récupération) */}
      <section aria-labelledby="timeline-title" className="surface mb-6 p-5 sm:p-6">
        <h2
          id="timeline-title"
          className="section-kicker mb-6"
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
      <section aria-labelledby="timer-title" className="surface p-5 sm:p-6">
        <h2
          id="timer-title"
          className="section-kicker mb-4"
        >
          Timer
        </h2>
        <Timer
          completeAction={completeProgramSession}
          exercises={trainingSession.exercises}
          warmup={trainingSession.warmup}
          cooldown={trainingSession.cooldown}
          sessionMeta={sessionMeta}
        />
      </section>
    </div>
  );
}
