import Image from 'next/image';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import { Timer } from '@/components/Timer';
import { WorkoutTimeline } from '@/components/WorkoutTimeline';
import { GlassPanel, MetricPill } from '@/components/PremiumPrimitives';
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
      revalidatePath(`/programs/${id}`);
      revalidatePath(`/programs/${id}/sessions/${sessionId}`);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Impossible d'enregistrer la seance",
      };
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <nav aria-label="Retour">
        <Link href={`/programs/${id}`} className="premium-chip">
          <Icon name="arrow-left" className="h-4 w-4" />
          {program.title}
        </Link>
      </nav>

      <header className="relative overflow-hidden rounded-[2.4rem] border border-white/[0.15] bg-zinc-950/50 p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-6">
        <Image
          src="/visuals/workout-action.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 900px"
          className="-z-10 object-cover opacity-60"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-zinc-950 via-zinc-950/[0.55] to-zinc-950/[0.15]" />
        <p className="section-kicker mb-4">
          Semaine {weekNumber} - {week.theme}
        </p>
        <h1 className="page-title max-w-3xl">
          Seance {sessionNumber} - {trainingSession.title}
        </h1>
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <MetricPill icon="target" label="Focus" value={trainingSession.focus} tone="lime" />
          <MetricPill icon="timer" label="Duree" value={`${trainingSession.duration_minutes} min`} />
          <MetricPill
            icon="activity"
            label="Exercices"
            value={`${trainingSession.exercises.length}`}
            tone="orange"
          />
        </div>
      </header>

      <section aria-labelledby="timeline-title">
        <GlassPanel className="p-5 sm:p-6">
          <h2 id="timeline-title" className="section-kicker mb-6">
            Programme
          </h2>
          <WorkoutTimeline
            exercises={trainingSession.exercises}
            warmup={trainingSession.warmup}
            cooldown={trainingSession.cooldown}
          />
        </GlassPanel>
      </section>

      <section aria-labelledby="timer-title">
        <GlassPanel className="p-5 sm:p-6">
          <h2 id="timer-title" className="section-kicker mb-6">
            Timer
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
  );
}
