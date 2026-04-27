import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import { Timer } from '@/components/Timer';
import { WorkoutTimeline } from '@/components/WorkoutTimeline';

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

  return (
    <div className="max-w-2xl mx-auto">
      {/* RGAA 4.1: lien de retour */}
      <nav aria-label="Retour" className="mb-8">
        <Link
          href="/workouts"
          className="text-sm text-zinc-400 hover:text-zinc-900 transition-colors focus-visible:outline-none focus-visible:underline"
        >
          ← Mes séances
        </Link>
      </nav>

      {/* En-tête */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">{workout.title}</h1>
        <p className="text-sm text-zinc-400">
          {workout.sport} · {DIFFICULTY_LABELS[workout.difficulty]} · {workout.durationMinutes} min
        </p>
      </header>

      {/* Timeline visuelle (échauffement + exercices + récupération) */}
      <section aria-labelledby="timeline-title" className="py-6 border-t border-zinc-100">
        <h2 id="timeline-title" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-6">
          Programme
        </h2>
        <WorkoutTimeline
          exercises={workout.exercises}
          warmup={workout.warmup}
          cooldown={workout.cooldown}
        />
      </section>

      {/* Timer interactif */}
      <section aria-labelledby="timer-title" className="py-6 border-t border-zinc-100">
        <h2 id="timer-title" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">
          Timer
        </h2>
        <Timer exercises={workout.exercises} totalDurationMinutes={workout.durationMinutes} />
      </section>
    </div>
  );
}
