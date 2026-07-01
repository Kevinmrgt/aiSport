export default function WorkoutsLoading() {
  return (
    <section aria-labelledby="workouts-title" aria-busy="true" className="space-y-8">
      <div className="glass-panel overflow-hidden p-5">
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div>
            <div className="mb-4 h-3 w-32 animate-pulse rounded-full bg-primary-300/25" aria-hidden="true" />
            <h1 id="workouts-title" className="page-title">
              Mes seances
            </h1>
            <div className="mt-5 flex flex-wrap gap-2" aria-hidden="true">
              <div className="h-10 w-32 animate-pulse rounded-full bg-white/[0.08]" />
              <div className="h-10 w-32 animate-pulse rounded-full bg-white/[0.08]" />
              <div className="h-10 w-20 animate-pulse rounded-full bg-primary-300/25" />
            </div>
          </div>
          <div className="hidden h-44 rounded-[1.75rem] bg-[url('/visuals/workout-action.webp')] bg-cover bg-center opacity-50 lg:block" aria-hidden="true" />
        </div>
      </div>

      <ul className="grid gap-3 lg:grid-cols-2" aria-label="Chargement des entrainements">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="glass-soft p-4" aria-hidden="true">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-primary-300/20" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-white/10" />
              </div>
              <div className="h-9 w-20 animate-pulse rounded-full bg-white/[0.08]" />
            </div>
          </li>
        ))}
      </ul>

      <p className="sr-only">Chargement de vos entrainements en cours...</p>
    </section>
  );
}
