// RGAA 4.1: état de chargement accessible via aria-busy
export default function WorkoutsLoading() {
  return (
    <section aria-labelledby="workouts-title" aria-busy="true">
      <div className="flex items-center justify-between mb-8">
        <h1 id="workouts-title" className="text-2xl font-bold text-zinc-900">
          Mes séances
        </h1>
        <div className="h-9 w-36 rounded-md bg-zinc-100 animate-pulse" aria-hidden="true" />
      </div>

      {/* Filtres skeleton */}
      <div className="flex gap-2 mb-6" aria-hidden="true">
        <div className="h-8 w-32 rounded-md bg-zinc-100 animate-pulse" />
        <div className="h-8 w-32 rounded-md bg-zinc-100 animate-pulse" />
        <div className="h-8 w-16 rounded-md bg-zinc-100 animate-pulse" />
      </div>

      {/* Liste skeleton */}
      <ul className="divide-y divide-zinc-100" aria-label="Chargement des entraînements">
        {Array.from({ length: 7 }).map((_, i) => (
          <li key={i} className="flex items-center gap-4 py-4" aria-hidden="true">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 rounded bg-zinc-100 animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-zinc-100 animate-pulse" />
            </div>
            <div className="h-4 w-10 rounded bg-zinc-100 animate-pulse shrink-0" />
          </li>
        ))}
      </ul>

      <p className="sr-only">Chargement de vos entraînements en cours…</p>
    </section>
  );
}
