// RGAA 4.1: état de chargement accessible pour le détail d'un entraînement
export default function WorkoutDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl" aria-busy="true" aria-label="Chargement de l'entraînement">
      {/* Lien retour skeleton */}
      <div className="mb-8 h-4 w-24 animate-pulse rounded bg-white/10" aria-hidden="true" />

      {/* Titre + meta skeleton */}
      <div className="surface mb-6 space-y-3 p-6" aria-hidden="true">
        <div className="h-8 w-2/3 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-white/10" />
      </div>

      {/* Sections skeleton */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="surface mb-6 space-y-3 p-5" aria-hidden="true">
          <div className="h-3 w-24 animate-pulse rounded bg-primary-300/25" />
          <div className="h-4 w-full animate-pulse rounded bg-white/10" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-white/10" />
        </div>
      ))}

      <p className="sr-only">Chargement de l&apos;entraînement en cours…</p>
    </div>
  );
}
