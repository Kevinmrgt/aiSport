import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { isServerApiNotFound, serverApi } from '@/lib/server-api';
import { Timer } from '@/components/Timer';
import { WorkoutTimeline } from '@/components/WorkoutTimeline';
import { GlassPanel } from '@/components/PremiumPrimitives';
import { Icon } from '@/components/ui/Icon';
import type { CreateSessionLogInput } from '@alcide/shared';

interface SessionPageProps {
  params: Promise<{ id: string; sessionId: string }>;
}

export default async function ProgramSessionPage({ params }: SessionPageProps) {
  const { id, sessionId } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const parts = sessionId.split('-');
  const weekNumber = parseInt(parts[0] ?? '', 10);
  const sessionNumber = parseInt(parts[1] ?? '', 10);

  if (isNaN(weekNumber) || isNaN(sessionNumber)) {
    notFound();
  }

  let program: Awaited<ReturnType<typeof serverApi.getProgram>>;
  try {
    program = await serverApi.getProgram(id);
  } catch (error) {
    if (isServerApiNotFound(error)) {
      notFound();
    }
    throw error;
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

  async function completeProgramSession(
    payload: CreateSessionLogInput,
  ): Promise<{ error?: string } | void> {
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
      revalidatePath(`/programs/${id}`);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Impossible d'enregistrer la seance",
      };
    }
  }

  return (
    <div className="detail-page space-y-7">
      <nav aria-label="Retour">
        <Link href={`/programs/${id}`} className="back-link">
          <Icon name="arrow-left" className="h-4 w-4" />
          {program.title}
        </Link>
      </nav>
      <header className="page-heading block">
        <h1 className="page-title">
          Séance {sessionNumber} · {trainingSession.title}
        </h1>
        <div className="detail-meta">
          <span>
            Semaine {weekNumber} · {week.theme}
          </span>
          <span>Cible : {trainingSession.duration_minutes} min</span>
          <span>{trainingSession.exercises.length} exercices</span>
        </div>
        <p className="muted-copy mt-4">{trainingSession.focus}</p>
      </header>
      <div className="detail-grid">
        <section aria-labelledby="timeline-title" className="timeline-panel">
          <GlassPanel className="panel-padding">
            <h2 id="timeline-title" className="panel-title">
              Programme de la séance
            </h2>
            <WorkoutTimeline
              exercises={trainingSession.exercises}
              warmup={trainingSession.warmup}
              cooldown={trainingSession.cooldown}
            />
          </GlassPanel>
        </section>
        <section aria-labelledby="timer-title" className="timer-panel">
          <GlassPanel className="panel-padding">
            <h2 id="timer-title" className="panel-title">
              Minuteur
            </h2>
            <Timer
              completeAction={completeProgramSession}
              exercises={trainingSession.exercises}
              warmup={trainingSession.warmup}
              cooldown={trainingSession.cooldown}
              sessionMeta={sessionMeta}
            />
          </GlassPanel>
        </section>
      </div>
    </div>
  );
}
