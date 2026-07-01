import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import { WorkoutCard } from '@/components/WorkoutCard';
import { EmptyState, GlassPanel, MetricPill } from '@/components/PremiumPrimitives';

const SPORTS = ['football', 'basketball', 'natation', 'course', 'cyclisme', 'musculation', 'yoga', 'tennis'];
const LEVELS = [
  { value: 'beginner', label: 'Debutant' },
  { value: 'intermediate', label: 'Intermediaire' },
  { value: 'advanced', label: 'Avance' },
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
  const sport = query.sport || undefined;
  const level = query.level || undefined;

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
    <section aria-labelledby="workouts-title" className="space-y-6">
      <GlassPanel className="abstract-surface mobile-compact-header p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker mb-3">Historique</p>
            <h1 id="workouts-title" className="page-title">
              Mes seances
            </h1>
            <p className="muted-copy mt-3 max-w-2xl">
              Retrouvez vos routines, filtrez par contexte et relancez le timer quand vous etes pret.
            </p>
          </div>
          <Link href="/generate" className="action-primary mobile-header-action w-full sm:w-auto">
            Nouvelle seance
          </Link>
        </div>
        <div className="mobile-header-metrics mt-6 grid gap-2 sm:grid-cols-3">
          <MetricPill icon="activity" label="Resultats" value={`${total}`} tone="lime" />
          <MetricPill icon="target" label="Sport" value={sport ?? 'Tous'} />
          <MetricPill icon="chart" label="Niveau" value={level ?? 'Tous'} tone="orange" />
        </div>
      </GlassPanel>

      <form
        method="GET"
        action="/workouts"
        className="glass-soft flex flex-wrap items-center gap-2 p-3"
        aria-label="Filtrer les entrainements"
      >
        <label htmlFor="filter-sport" className="sr-only">
          Sport
        </label>
        <select
          id="filter-sport"
          name="sport"
          defaultValue={sport ?? ''}
          className="field-control py-2 sm:w-auto"
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
          className="field-control py-2 sm:w-auto"
        >
          <option value="">Tous les niveaux</option>
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>

        <button type="submit" className="action-primary min-h-11 w-full px-5 py-2 text-sm sm:w-auto">
          Filtrer
        </button>

        {(sport || level) && (
          <Link href="/workouts" className="action-secondary min-h-11 w-full px-5 py-2 text-sm sm:w-auto">
            Effacer
          </Link>
        )}
      </form>

      {workouts.length === 0 ? (
        <EmptyState
          title={sport || level ? 'Aucun resultat' : 'Aucune seance pour l instant'}
          description={
            sport || level
              ? 'Essayez d autres filtres ou creez une nouvelle routine.'
              : 'Creez votre premiere seance pour remplir cet espace training.'
          }
          href="/generate"
          cta="Creer une seance"
        />
      ) : (
        <>
          <ul
            className="grid gap-4 lg:grid-cols-2"
            aria-label={`${workouts.length} entrainement${workouts.length > 1 ? 's' : ''} sur ${total}`}
          >
            {workouts.map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} onDelete={handleDelete} />
            ))}
          </ul>

          {totalPages > 1 && (
            <nav
              aria-label="Pagination des entrainements"
              className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm sm:gap-6"
            >
              {page > 1 ? (
                <Link href={pageUrl(page - 1)} className="action-secondary min-h-10 px-4 py-2">
                  Precedent
                </Link>
              ) : (
                <span className="select-none text-zinc-700">Precedent</span>
              )}

              <span className="premium-chip" aria-current="page">
                {page} / {totalPages}
              </span>

              {hasMore ? (
                <Link href={pageUrl(page + 1)} className="action-secondary min-h-10 px-4 py-2">
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
