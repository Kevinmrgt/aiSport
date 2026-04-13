import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import { WorkoutCard } from '@/components/WorkoutCard';

// OWASP A01: route protégée
export default async function WorkoutsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Server Action : suppression avec ownership vérifié côté backend (OWASP A01)
  async function handleDelete(id: string) {
    'use server';
    await serverApi.deleteWorkout(id);
    // Revalider le cache de la page liste après suppression
    revalidatePath('/workouts');
  }

  const workouts = await serverApi.getWorkouts();

  if (workouts.length === 0) {
    return (
      <section aria-labelledby="workouts-title">
        <h1 id="workouts-title" className="text-3xl font-bold text-gray-900 mb-8">
          Mes entraînements
        </h1>

        {/* État vide — RGAA 4.1: message explicite et action claire */}
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <p aria-hidden="true" className="text-5xl mb-4">🏃</p>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Aucun entraînement pour l&apos;instant
          </h2>
          <p className="text-gray-600 mb-6">
            Générez votre premier programme personnalisé par IA.
          </p>
          <Link
            href="/generate"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Générer un entraînement
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="workouts-title">
      <div className="flex items-center justify-between mb-8">
        <h1 id="workouts-title" className="text-3xl font-bold text-gray-900">
          Mes entraînements
        </h1>
        <Link
          href="/generate"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Nouvel entraînement
        </Link>
      </div>

      <ul
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-label={`${workouts.length} entraînement${workouts.length > 1 ? 's' : ''}`}
      >
        {workouts.map((workout) => (
          <WorkoutCard key={workout.id} workout={workout} onDelete={handleDelete} />
        ))}
      </ul>
    </section>
  );
}
