// RGAA 4.1: état de chargement accessible pour le détail d'un programme
export default function ProgramDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto" aria-busy="true" aria-label="Chargement du programme">
      {/* Lien retour skeleton */}
      <div className="h-4 w-28 rounded bg-zinc-100 animate-pulse mb-8" aria-hidden="true" />

      {/* Titre + meta skeleton */}
      <div className="mb-6 space-y-2" aria-hidden="true">
        <div className="h-8 w-2/3 rounded bg-zinc-100 animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-zinc-100 animate-pulse" />
      </div>

      {/* Résumé progression skeleton */}
      <div className="mb-8 p-4 bg-zinc-50 rounded-lg border border-zinc-100 space-y-2" aria-hidden="true">
        <div className="h-4 w-full rounded bg-zinc-100 animate-pulse" />
        <div className="h-4 w-4/5 rounded bg-zinc-100 animate-pulse" />
      </div>

      {/* Tabs semaines skeleton */}
      <div className="flex gap-1 border-b border-zinc-200 mb-6" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-16 rounded-t bg-zinc-100 animate-pulse" />
        ))}
      </div>

      {/* Séances skeleton */}
      <div className="space-y-0" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-4 border-b border-zinc-100">
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-1/3 rounded bg-zinc-100 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-zinc-100 animate-pulse" />
              <div className="h-3 w-1/4 rounded bg-zinc-100 animate-pulse" />
            </div>
            <div className="h-8 w-20 rounded-md bg-zinc-100 animate-pulse shrink-0" />
          </div>
        ))}
      </div>

      <p className="sr-only">Chargement du programme en cours…</p>
    </div>
  );
}
