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

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    params.set('page', String(p));
    if (sport) params.set('sport', sport);
    if (level) params.set('level', level);
    return `/workouts?${params.toString()}`;
  }

  return (
    <section aria-labelledby="workouts-title">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-8">
        <h1 id="workouts-title" className="text-2xl font-bold text-zinc-900">
          Mes séances
        </h1>
        <Link
          href="/generate"
          className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
        >
          Nouvelle séance
        </Link>
      </div>

      {/* Filtres — formulaire GET sans JavaScript requis (RGAA 4.1) */}
      <form
        method="GET"
        action="/workouts"
        className="flex flex-wrap items-center gap-2 mb-6"
        aria-label="Filtrer les entraînements"
      >
        {/* RGAA 4.1: labels sr-only pour selects sans label visible */}
        <label htmlFor="filter-sport" className="sr-only">Sport</label>
        <select
          id="filter-sport"
          name="sport"
          defaultValue={sport ?? ''}
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
        >
          <option value="">Tous les sports</option>
          {SPORTS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        <label htmlFor="filter-level" className="sr-only">Niveau</label>
        <select
          id="filter-level"
          name="level"
          defaultValue={level ?? ''}
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
        >
          <option value="">Tous les niveaux</option>
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="px-3 py-1.5 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
        >
          Filtrer
        </button>

        {(sport || level) && (
          <Link
            href="/workouts"
            className="text-sm text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            Effacer
          </Link>
        )}

        <span className="ml-auto text-sm text-zinc-400">
          {total} résultat{total !== 1 ? 's' : ''}
        </span>
      </form>

      {workouts.length === 0 ? (
        <div className="py-24 text-center">
          <h2 className="text-base font-medium text-zinc-900 mb-2">
            {sport || level ? 'Aucun résultat' : 'Aucune séance pour l\'instant'}
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            {sport || level
              ? 'Essayez d\'autres filtres ou générez une nouvelle séance.'
              : 'Votre premier programme personnalisé est à un clic.'}
          </p>
          <Link
            href="/generate"
            className="inline-flex items-center justify-center px-5 py-2 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
          >
            Générer un entraînement
          </Link>
        </div>
      ) : (
        <>
          <ul
            className="divide-y divide-zinc-100"
            aria-label={`${workouts.length} entraînement${workouts.length > 1 ? 's' : ''} sur ${total}`}
          >
            {workouts.map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} onDelete={handleDelete} />
            ))}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              aria-label="Pagination des entraînements"
              className="mt-8 flex items-center justify-center gap-6 text-sm"
            >
              {page > 1 ? (
                <Link
                  href={pageUrl(page - 1)}
                  className="text-zinc-500 hover:text-zinc-900 transition-colors focus-visible:outline-none focus-visible:underline"
                  aria-label="Page précédente"
                >
                  ← Précédent
                </Link>
              ) : (
                <span className="text-zinc-300 select-none">← Précédent</span>
              )}

              <span className="text-zinc-400" aria-current="page">
                {page} / {totalPages}
              </span>

              {hasMore ? (
                <Link
                  href={pageUrl(page + 1)}
                  className="text-zinc-500 hover:text-zinc-900 transition-colors focus-visible:outline-none focus-visible:underline"
                  aria-label="Page suivante"
                >
                  Suivant →
                </Link>
              ) : (
                <span className="text-zinc-300 select-none">Suivant →</span>
              )}
            </nav>
          )}
        </>
      )}
    </section>
  );
}
