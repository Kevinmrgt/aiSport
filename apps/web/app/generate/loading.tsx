export default function GenerateLoading() {
  return (
    <div
      className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.92fr_1.08fr]"
      aria-busy="true"
      aria-label="Chargement du formulaire de generation"
    >
      <div className="glass-panel min-h-[30rem] overflow-hidden p-5" aria-hidden="true">
        <div className="abstract-surface h-full rounded-[1.75rem] opacity-70" />
      </div>

      <div className="glass-panel space-y-5 p-5 sm:p-6" aria-hidden="true">
        <div className="h-3 w-32 animate-pulse rounded-full bg-primary-300/25" />
        <div className="h-10 w-3/4 animate-pulse rounded-2xl bg-white/10" />
        <div className="grid gap-2 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-full bg-white/[0.08]" />
          ))}
        </div>
        <div className="grid gap-4 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
              <div className="h-12 animate-pulse rounded-[1rem] bg-white/[0.08]" />
            </div>
          ))}
        </div>
        <div className="h-28 animate-pulse rounded-[1.25rem] bg-white/[0.08]" />
        <div className="h-12 animate-pulse rounded-full bg-primary-300/25" />
      </div>

      <p className="sr-only">Chargement du formulaire en cours...</p>
    </div>
  );
}
