import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import { Timer } from '@/components/Timer';
import { WorkoutTimeline } from '@/components/WorkoutTimeline';
import type { CreateSessionLogInput } from '@sportcoach/shared';

interface WorkoutPageProps {
  params: { id: string };
}

const DIFFICULTY_LABELS = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};

// OWASP A01: route protégée + ownership vérifié côté backend
export default async function WorkoutDetailPage({ params }: WorkoutPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  let workout;
  try {
    workout = await serverApi.getWorkout(params.id);
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
      revalidatePath(`/workouts/${params.id}`);
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
          href="/workouts"
          className="text-sm font-semibold text-zinc-400 transition-colors hover:text-primary-300 focus-visible:outline-none focus-visible:underline"
        >
          Mes séances
        </Link>
      </nav>

      {/* En-tête */}
      <header className="surface mb-6 p-5 sm:p-6">
        <p className="section-kicker mb-2">Workout</p>
        <h1 className="page-title">{workout.title}</h1>
        <p className="mt-3 break-words text-sm leading-5 text-zinc-400">
          {workout.sport} · {DIFFICULTY_LABELS[workout.difficulty]} · {workout.durationMinutes} min
        </p>
      </header>

      {/* Timeline visuelle (échauffement + exercices + récupération) */}
      <section aria-labelledby="timeline-title" className="surface mb-6 p-5 sm:p-6">
        <h2 id="timeline-title" className="section-kicker mb-6">
          Programme
        </h2>
        <WorkoutTimeline
          exercises={workout.exercises}
          warmup={workout.warmup}
          cooldown={workout.cooldown}
        />
      </section>

      {/* Timer interactif */}
      <section aria-labelledby="timer-title" className="surface p-5 sm:p-6">
        <h2 id="timer-title" className="section-kicker mb-4">
          Timer
        </h2>
        <Timer
          completeAction={completeWorkout}
          exercises={workout.exercises}
          warmup={workout.warmup}
          cooldown={workout.cooldown}
          sessionMeta={workoutSessionMeta}
        />
      </section>
    </div>
  );
}
