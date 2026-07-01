export default function WorkoutDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6" aria-busy="true" aria-label="Chargement de l'entrainement">
      <div className="h-10 w-32 animate-pulse rounded-full bg-white/[0.08]" aria-hidden="true" />

      <div className="glass-panel overflow-hidden p-5" aria-hidden="true">
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-4">
            <div className="h-3 w-28 animate-pulse rounded bg-primary-300/25" />
            <div className="h-10 w-3/4 animate-pulse rounded-2xl bg-white/10" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
            <div className="flex gap-2">
              <div className="h-10 w-24 animate-pulse rounded-full bg-white/[0.08]" />
              <div className="h-10 w-24 animate-pulse rounded-full bg-white/[0.08]" />
            </div>
          </div>
          <div className="h-60 rounded-[1.75rem] bg-[url('/visuals/workout-action.webp')] bg-cover bg-center opacity-50" />
        </div>
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="glass-soft space-y-3 p-5" aria-hidden="true">
          <div className="h-3 w-24 animate-pulse rounded bg-primary-300/25" />
          <div className="h-4 w-full animate-pulse rounded bg-white/10" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-white/10" />
        </div>
      ))}

      <p className="sr-only">Chargement de l&apos;entrainement en cours...</p>
    </div>
  );
}
