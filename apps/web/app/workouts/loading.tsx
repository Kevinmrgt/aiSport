// RGAA 4.1: état de chargement accessible via aria-busy
export default function WorkoutsLoading() {
  return (
    <section aria-labelledby="workouts-title" aria-busy="true">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 id="workouts-title" className="page-title">
          Mes séances
        </h1>
        <div className="h-9 w-36 animate-pulse rounded-full bg-white/10" aria-hidden="true" />
      </div>

      {/* Filtres skeleton */}
      <div className="mb-6 flex flex-wrap gap-2" aria-hidden="true">
        <div className="h-8 w-full animate-pulse rounded-lg bg-white/10 sm:w-32" />
        <div className="h-8 w-full animate-pulse rounded-lg bg-white/10 sm:w-32" />
        <div className="h-8 w-full animate-pulse rounded-full bg-primary-300/30 sm:w-16" />
      </div>

      {/* Liste skeleton */}
      <ul className="grid gap-3 lg:grid-cols-2" aria-label="Chargement des entraînements">
        {Array.from({ length: 7 }).map((_, i) => (
          <li key={i} className="surface-soft flex min-w-0 flex-col items-stretch gap-4 p-4 sm:flex-row sm:items-center" aria-hidden="true">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-white/10" />
            </div>
            <div className="h-4 w-10 shrink-0 animate-pulse rounded bg-white/10" />
          </li>
        ))}
      </ul>

      <p className="sr-only">Chargement de vos entraînements en cours…</p>
    </section>
  );
}
