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

interface WorkoutPageProps {
  params: Promise<{ id: string }>;
}

const DIFFICULTY_LABELS = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
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
  } catch (error) {
    if (isServerApiNotFound(error)) {
      notFound();
    }
    throw error;
  }

  const workoutSessionMeta = {
    sourceType: 'workout',
    workoutId: workout.id,
    title: workout.title,
    sport: workout.sport,
    difficulty: workout.difficulty,
    plannedDurationMinutes: workout.durationMinutes,
  } as const;

  async function completeWorkout(
    payload: CreateSessionLogInput,
  ): Promise<{ error?: string } | void> {
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
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Impossible d'enregistrer la seance",
      };
    }
  }

  return (
    <div className="detail-page space-y-7">
      <nav aria-label="Retour">
        <Link href="/workouts" className="back-link">
          <Icon name="arrow-left" className="h-4 w-4" />
          Mes séances
        </Link>
      </nav>
      <header className="page-heading block">
        <h1 className="page-title">{workout.title}</h1>
        <div className="detail-meta">
          <span className="capitalize">{workout.sport}</span>
          <span>{DIFFICULTY_LABELS[workout.difficulty]}</span>
          <span>{workout.durationMinutes} min</span>
        </div>
      </header>
      <div className="detail-grid">
        <section aria-labelledby="timeline-title" className="timeline-panel">
          <GlassPanel className="panel-padding">
            <h2 id="timeline-title" className="panel-title">
              Programme de la séance
            </h2>
            <WorkoutTimeline
              exercises={workout.exercises}
              warmup={workout.warmup}
              cooldown={workout.cooldown}
            />
          </GlassPanel>
        </section>
        <section aria-labelledby="timer-title" className="timer-panel">
          <GlassPanel className="panel-padding">
            <h2 id="timer-title" className="panel-title">
              Minuteur
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
    </div>
  );
}
