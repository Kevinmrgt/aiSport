export default function ProgramDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6" aria-busy="true" aria-label="Chargement du programme">
      <div className="h-10 w-32 animate-pulse rounded-full bg-white/[0.08]" aria-hidden="true" />

      <div className="glass-panel overflow-hidden p-5" aria-hidden="true">
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-4">
            <div className="h-3 w-28 animate-pulse rounded bg-primary-300/25" />
            <div className="h-10 w-3/4 animate-pulse rounded-2xl bg-white/10" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="h-14 animate-pulse rounded-full bg-white/[0.08]" />
              <div className="h-14 animate-pulse rounded-full bg-white/[0.08]" />
              <div className="h-14 animate-pulse rounded-full bg-primary-300/20" />
            </div>
          </div>
          <div className="abstract-surface h-60 rounded-[1.75rem] opacity-70" />
        </div>
      </div>

      <div className="glass-soft flex flex-wrap gap-2 p-2" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-20 animate-pulse rounded-full bg-white/[0.08]" />
        ))}
      </div>

      <div className="space-y-3" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-soft p-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-primary-300/20" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
              </div>
              <div className="h-9 w-20 animate-pulse rounded-full bg-primary-300/25" />
            </div>
          </div>
        ))}
      </div>

      <p className="sr-only">Chargement du programme en cours...</p>
    </div>
  );
}
