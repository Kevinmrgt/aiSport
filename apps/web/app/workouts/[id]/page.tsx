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

interface WorkoutPageProps {
  params: Promise<{ id: string }>;
}

const DIFFICULTY_LABELS = {
  beginner: 'Debutant',
  intermediate: 'Intermediaire',
  advanced: 'Avance',
};

export default async function WorkoutDetailPage({ params }: WorkoutPageProps) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  let workout;
  try {
    workout = await serverApi.getWorkout(id);
  } catch {
    notFound();
  }

  const workoutSessionMeta = {
    sourceType: 'workout',
    workoutId: workout.id,
    title: workout.title,
    sport: workout.sport,
    difficulty: workout.difficulty,
    plannedDurationMinutes: workout.durationMinutes,
  } as const;

  async function completeWorkout(payload: CreateSessionLogInput): Promise<{ error?: string } | void> {
    'use server';
    try {
      await serverApi.createSessionLog({
        ...workoutSessionMeta,
        durationSeconds: payload.durationSeconds,
        perceivedEffort: payload.perceivedEffort,
        feedback: payload.feedback,
        completedAt: payload.completedAt,
        ...(payload.painNotes ? { painNotes: payload.painNotes } : {}),
        ...(payload.notes ? { notes: payload.notes } : {}),
      });
      revalidatePath('/dashboard');
      revalidatePath(`/workouts/${id}`);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Impossible d'enregistrer la seance",
      };
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <nav aria-label="Retour">
        <Link href="/workouts" className="premium-chip">
          <Icon name="arrow-left" className="h-4 w-4" />
          Mes seances
        </Link>
      </nav>

      <header className="abstract-surface mobile-compact-header rounded-[2.4rem] border border-white/[0.15] bg-zinc-950/50 p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-6">
        <p className="section-kicker mb-4">Seance</p>
        <h1 className="page-title max-w-3xl">{workout.title}</h1>
        <div className="mobile-header-metrics mt-6 grid gap-2 sm:grid-cols-3">
          <MetricPill icon="activity" label="Sport" value={workout.sport} tone="lime" />
          <MetricPill
            icon="target"
            label="Niveau"
            value={DIFFICULTY_LABELS[workout.difficulty]}
          />
          <MetricPill icon="timer" label="Duree" value={`${workout.durationMinutes} min`} tone="orange" />
        </div>
      </header>

      <section aria-labelledby="timeline-title">
        <GlassPanel className="p-5 sm:p-6">
          <h2 id="timeline-title" className="section-kicker mb-6">
            Programme
          </h2>
          <WorkoutTimeline
            exercises={workout.exercises}
            warmup={workout.warmup}
            cooldown={workout.cooldown}
          />
        </GlassPanel>
      </section>

      <section aria-labelledby="timer-title">
        <GlassPanel className="p-5 sm:p-6">
          <h2 id="timer-title" className="section-kicker mb-6">
            Timer
          </h2>
          <Timer
            completeAction={completeWorkout}
            exercises={workout.exercises}
            warmup={workout.warmup}
            cooldown={workout.cooldown}
            sessionMeta={workoutSessionMeta}
          />
        </GlassPanel>
      </section>
    </div>
  );
}
