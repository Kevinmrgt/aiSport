// RGAA 4.1: état de chargement accessible pour le détail d'un programme
export default function ProgramDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl" aria-busy="true" aria-label="Chargement du programme">
      {/* Lien retour skeleton */}
      <div className="mb-8 h-4 w-28 animate-pulse rounded bg-white/10" aria-hidden="true" />

      {/* Titre + meta skeleton */}
      <div className="surface mb-6 space-y-3 p-6" aria-hidden="true">
        <div className="h-8 w-2/3 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
      </div>

      {/* Résumé progression skeleton */}
      <div className="surface-soft mb-8 space-y-2 p-4" aria-hidden="true">
        <div className="h-4 w-full animate-pulse rounded bg-white/10" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-white/10" />
      </div>

      {/* Tabs semaines skeleton */}
      <div className="mb-6 flex flex-wrap gap-2 rounded-lg border border-white/10 bg-zinc-950/70 p-1" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-16 animate-pulse rounded-md bg-white/10" />
        ))}
      </div>

      {/* Séances skeleton */}
      <div className="space-y-3" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex min-w-0 flex-col gap-4 rounded-lg border border-white/10 bg-zinc-950/60 p-4 sm:flex-row sm:items-center">
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-1/3 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-1/4 animate-pulse rounded bg-white/10" />
            </div>
            <div className="h-8 w-20 shrink-0 animate-pulse rounded-full bg-primary-300/25" />
          </div>
        ))}
      </div>

      <p className="sr-only">Chargement du programme en cours…</p>
    </div>
  );
}
