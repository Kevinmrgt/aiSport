import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import { Timer } from '@/components/Timer';

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
    // 404 ou ownership invalide → page 404
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* RGAA 4.1: fil d'Ariane */}
      <nav aria-label="Fil d'Ariane" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <Link href="/workouts" className="hover:text-primary-600 focus:outline-none focus:underline">
              Mes entraînements
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-900 font-medium" aria-current="page">
            {workout.title}
          </li>
        </ol>
      </nav>

      {/* En-tête du workout */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{workout.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{workout.sport}</span>
          <span aria-hidden="true">·</span>
          <span>{DIFFICULTY_LABELS[workout.difficulty]}</span>
          <span aria-hidden="true">·</span>
          <span>{workout.durationMinutes} minutes</span>
        </div>
      </header>

      {/* Section échauffement */}
      {workout.warmup && workout.warmup.length > 0 && (
        <section aria-labelledby="warmup-title" className="mb-6 bg-amber-50 rounded-xl p-4">
          <h2 id="warmup-title" className="text-base font-semibold text-amber-800 mb-3">
            Échauffement
          </h2>
          <ul className="space-y-2">
            {workout.warmup.map((phase, i) => (
              <li key={i} className="text-sm text-amber-700">
                <span className="font-medium">{phase.name}</span>
                {' — '}{Math.round(phase.duration_seconds / 60)} min · {phase.description}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Timer principal avec les exercices */}
      <section aria-labelledby="timer-title">
        <h2 id="timer-title" className="text-base font-semibold text-gray-900 mb-4">
          Programme ({workout.exercises.length} exercice{workout.exercises.length > 1 ? 's' : ''})
        </h2>
        <Timer exercises={workout.exercises} />
      </section>

      {/* Section récupération */}
      {workout.cooldown && workout.cooldown.length > 0 && (
        <section aria-labelledby="cooldown-title" className="mt-6 bg-blue-50 rounded-xl p-4">
          <h2 id="cooldown-title" className="text-base font-semibold text-blue-800 mb-3">
            Récupération
          </h2>
          <ul className="space-y-2">
            {workout.cooldown.map((phase, i) => (
              <li key={i} className="text-sm text-blue-700">
                <span className="font-medium">{phase.name}</span>
                {' — '}{Math.round(phase.duration_seconds / 60)} min · {phase.description}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
