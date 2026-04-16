import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import { WorkoutCard } from '@/components/WorkoutCard';

const SPORTS = ['football', 'basketball', 'natation', 'course', 'cyclisme', 'musculation', 'yoga', 'tennis'];
const LEVELS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
];

// OWASP A01: route protégée
export default async function WorkoutsPage({
  searchParams,
}: {
  searchParams: { page?: string; sport?: string; level?: string };
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const page = Math.max(1, Number(searchParams.page) || 1);
  const sport = searchParams.sport || undefined;
  const level = searchParams.level || undefined;

  // Server Action : suppression avec ownership vérifié côté backend (OWASP A01)
  async function handleDelete(id: string) {
    'use server';
    await serverApi.deleteWorkout(id);
    revalidatePath('/workouts');
  }

  const { workouts, total, hasMore } = await serverApi.getWorkouts({ page, sport, level });

  const totalPages = Math.ceil(total / 9);

  // Construire les params pour les liens de navigation
  function pageUrl(p: number) {
    const params = new URLSearchParams();
    params.set('page', String(p));
    if (sport) params.set('sport', sport);
    if (level) params.set('level', level);
    return `/workouts?${params.toString()}`;
  }

  return (
    <section aria-labelledby="workouts-title">
      <div className="flex items-center justify-between mb-6">
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

      {/* Filtres — formulaire GET sans JavaScript requis (RGAA 4.1) */}
      <form
        method="GET"
        action="/workouts"
        className="flex flex-wrap gap-3 mb-6 p-4 bg-white rounded-xl border border-gray-100 shadow-sm"
        aria-label="Filtrer les entraînements"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-sport" className="text-xs font-medium text-gray-600">
            Sport
          </label>
          <select
            id="filter-sport"
            name="sport"
            defaultValue={sport ?? ''}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Tous les sports</option>
            {SPORTS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-level" className="text-xs font-medium text-gray-600">
            Niveau
          </label>
          <select
            id="filter-level"
            name="level"
            defaultValue={level ?? ''}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Tous les niveaux</option>
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Filtrer
          </button>
          {(sport || level) && (
            <Link
              href="/workouts"
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Réinitialiser
            </Link>
          )}
        </div>

        <p className="flex items-end text-sm text-gray-500 ml-auto">
          {total} entraînement{total > 1 ? 's' : ''}
        </p>
      </form>

      {workouts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <p aria-hidden="true" className="text-5xl mb-4">🏃</p>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {sport || level ? 'Aucun résultat pour ces filtres' : 'Aucun entraînement pour l\'instant'}
          </h2>
          <p className="text-gray-600 mb-6">
            {sport || level
              ? 'Essayez d\'autres filtres ou générez un nouvel entraînement.'
              : 'Générez votre premier programme personnalisé par IA.'}
          </p>
          <Link
            href="/generate"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Générer un entraînement
          </Link>
        </div>
      ) : (
        <>
          <ul
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-label={`${workouts.length} entraînement${workouts.length > 1 ? 's' : ''} affichés sur ${total}`}
          >
            {workouts.map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} onDelete={handleDelete} />
            ))}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              aria-label="Pagination des entraînements"
              className="mt-8 flex items-center justify-center gap-2"
            >
              {page > 1 && (
                <Link
                  href={pageUrl(page - 1)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Page précédente"
                >
                  ← Précédent
                </Link>
              )}

              <span className="text-sm text-gray-600" aria-current="page">
                Page {page} sur {totalPages}
              </span>

              {hasMore && (
                <Link
                  href={pageUrl(page + 1)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Page suivante"
                >
                  Suivant →
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </section>
  );
}
