// RGAA 4.1: état de chargement accessible pour le détail d'un entraînement
export default function WorkoutDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto" aria-busy="true" aria-label="Chargement de l'entraînement">
      {/* Lien retour skeleton */}
      <div className="h-4 w-24 rounded bg-zinc-100 animate-pulse mb-8" aria-hidden="true" />

      {/* Titre + meta skeleton */}
      <div className="mb-8 space-y-2" aria-hidden="true">
        <div className="h-8 w-2/3 rounded bg-zinc-100 animate-pulse" />
        <div className="h-4 w-1/3 rounded bg-zinc-100 animate-pulse" />
      </div>

      {/* Sections skeleton */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="py-6 border-t border-zinc-100 space-y-3" aria-hidden="true">
          <div className="h-3 w-24 rounded bg-zinc-100 animate-pulse" />
          <div className="h-4 w-full rounded bg-zinc-100 animate-pulse" />
          <div className="h-4 w-4/5 rounded bg-zinc-100 animate-pulse" />
        </div>
      ))}

      <p className="sr-only">Chargement de l&apos;entraînement en cours…</p>
    </div>
  );
}
