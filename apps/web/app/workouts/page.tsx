import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import { WorkoutCard } from '@/components/WorkoutCard';
import { EmptyState, GlassPanel } from '@/components/PremiumPrimitives';

const LEVELS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
];

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
  const sport = query.sport?.trim() || undefined;
  const level = query.level || undefined;

  async function handleDelete(id: string) {
    'use server';
    try {
      await serverApi.deleteWorkout(id);
      revalidatePath('/workouts');
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Impossible de supprimer l'entraînement.",
      };
    }
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
    <section aria-labelledby="workouts-title" className="space-y-7">
      <header className="page-heading">
        <div>
          <h1 id="workouts-title" className="page-title">
            Mes séances
          </h1>
          <p className="muted-copy mt-3">
            {total} séance{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/generate" className="action-primary">
          Nouvelle séance
        </Link>
      </header>
      <form
        method="GET"
        action="/workouts"
        className="glass-soft library-filter"
        aria-label="Filtrer les entrainements"
      >
        <div className="filter-field">
          <label htmlFor="filter-sport">Sport</label>
          <input
            type="search"
            id="filter-sport"
            name="sport"
            defaultValue={sport ?? ''}
            placeholder="Tous les sports"
            autoComplete="off"
            className="field-control"
          />
        </div>
        <div className="filter-field">
          <label htmlFor="filter-level">Niveau</label>
          <select
            id="filter-level"
            name="level"
            defaultValue={level ?? ''}
            className="field-control"
          >
            <option value="">Tous les niveaux</option>
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="action-primary">
          Filtrer
        </button>
        {(sport || level) && (
          <Link href="/workouts" className="text-link">
            Effacer
          </Link>
        )}
      </form>
      {workouts.length === 0 ? (
        <EmptyState
          title={sport || level ? 'Aucun résultat' : 'Aucune séance pour le moment'}
          description={
            sport || level
              ? 'Essayez d’autres filtres ou créez une séance.'
              : 'Vos séances apparaîtront ici une fois créées.'
          }
          href="/generate"
          cta="Créer une séance"
        />
      ) : (
        <>
          <GlassPanel className="workout-table">
            <div className="workout-row workout-row-heading" aria-hidden="true">
              <span>Séance</span>
              <span>Niveau</span>
              <span>Durée</span>
              <span>Créée le</span>
              <span />
            </div>
            <ul
              aria-label={`${workouts.length} entrainement${workouts.length > 1 ? 's' : ''} sur ${total}`}
            >
              {workouts.map((workout) => (
                <WorkoutCard key={workout.id} workout={workout} onDelete={handleDelete} />
              ))}
            </ul>
          </GlassPanel>
          {totalPages > 1 && (
            <nav aria-label="Pagination des entrainements" className="pagination">
              {page > 1 ? (
                <Link href={pageUrl(page - 1)} className="action-secondary">
                  Précédent
                </Link>
              ) : (
                <span aria-disabled="true">Précédent</span>
              )}
              <span aria-current="page">
                {page} / {totalPages}
              </span>
              {hasMore ? (
                <Link href={pageUrl(page + 1)} className="action-secondary">
                  Suivant
                </Link>
              ) : (
                <span aria-disabled="true">Suivant</span>
              )}
            </nav>
          )}
        </>
      )}
    </section>
  );
}
