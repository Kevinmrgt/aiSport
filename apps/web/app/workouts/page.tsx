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
  searchParams: Promise<{ page?: string; sport?: string; level?: string }>;
}) {
  const query = await searchParams;
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const page = Math.max(1, Number(query.page) || 1);
  const sport = query.sport || undefined;
  const level = query.level || undefined;

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
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-kicker mb-2">Historique</p>
          <h1 id="workouts-title" className="page-title">
            Mes séances
          </h1>
          <p className="muted-copy mt-2">
            Retrouvez vos workouts générés et relancez le timer quand vous êtes prêt.
          </p>
        </div>
        <Link
          href="/generate"
          className="action-primary w-full sm:w-auto"
        >
          + Nouvelle séance
        </Link>
      </div>

      {/* Filtres — formulaire GET sans JavaScript requis (RGAA 4.1) */}
      <form
        method="GET"
        action="/workouts"
        className="surface-soft mb-6 flex flex-wrap items-center gap-2 p-3"
        aria-label="Filtrer les entraînements"
      >
        {/* RGAA 4.1: labels sr-only pour selects sans label visible */}
        <label htmlFor="filter-sport" className="sr-only">
          Sport
        </label>
        <select
          id="filter-sport"
          name="sport"
          defaultValue={sport ?? ''}
          className="field-control py-1.5 sm:w-auto"
        >
          <option value="">Tous les sports</option>
          {SPORTS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        <label htmlFor="filter-level" className="sr-only">
          Niveau
        </label>
        <select
          id="filter-level"
          name="level"
          defaultValue={level ?? ''}
          className="field-control py-1.5 sm:w-auto"
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
          className="w-full rounded-full bg-primary-300 px-4 py-1.5 text-sm font-black text-zinc-950 transition-colors hover:bg-primary-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 sm:w-auto"
        >
          Filtrer
        </button>

        {(sport || level) && (
          <Link
            href="/workouts"
            className="w-full rounded-full px-3 py-1.5 text-center text-sm font-semibold text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white sm:w-auto"
          >
            Effacer
          </Link>
        )}

        <span className="w-full text-sm font-semibold text-primary-300 sm:ml-auto sm:w-auto">
          {total} résultat{total !== 1 ? 's' : ''}
        </span>
      </form>

      {workouts.length === 0 ? (
        <div className="surface mx-auto max-w-xl p-8 text-center">
          <h2 className="mb-2 text-xl font-black text-white">
            {sport || level ? 'Aucun résultat' : 'Aucune séance pour l\'instant'}
          </h2>
          <p className="muted-copy mb-6">
            {sport || level
              ? 'Essayez d\'autres filtres ou générez une nouvelle séance.'
              : 'Votre premier programme personnalisé est à un clic.'}
          </p>
          <Link
            href="/generate"
          className="action-primary w-full sm:w-auto"
          >
            Générer un entraînement
          </Link>
        </div>
      ) : (
        <>
          <ul
            className="grid gap-3 lg:grid-cols-2"
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
              className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm sm:gap-6"
            >
              {page > 1 ? (
                <Link
                  href={pageUrl(page - 1)}
                  className="text-zinc-400 transition-colors hover:text-primary-300 focus-visible:outline-none focus-visible:underline"
                  aria-label="Page précédente"
                >
                  Précédent
                </Link>
              ) : (
                <span className="select-none text-zinc-700">Précédent</span>
              )}

              <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-200" aria-current="page">
                {page} / {totalPages}
              </span>

              {hasMore ? (
                <Link
                  href={pageUrl(page + 1)}
                  className="text-zinc-400 transition-colors hover:text-primary-300 focus-visible:outline-none focus-visible:underline"
                  aria-label="Page suivante"
                >
                  Suivant
                </Link>
              ) : (
                <span className="select-none text-zinc-700">Suivant</span>
              )}
            </nav>
          )}
        </>
      )}
    </section>
  );
}
