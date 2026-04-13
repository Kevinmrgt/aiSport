// RGAA 4.1: état de chargement accessible pour le détail d'un entraînement
export default function WorkoutDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto" aria-busy="true" aria-label="Chargement de l'entraînement">
      {/* Fil d'Ariane skeleton */}
      <div className="flex items-center gap-2 mb-6" aria-hidden="true">
        <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
        <span className="text-gray-300">/</span>
        <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
      </div>

      {/* Titre skeleton */}
      <div className="h-8 w-2/3 rounded bg-gray-200 animate-pulse mb-4" aria-hidden="true" />

      {/* Badges skeleton */}
      <div className="flex gap-2 mb-8" aria-hidden="true">
        <div className="h-6 w-20 rounded-full bg-gray-200 animate-pulse" />
        <div className="h-6 w-24 rounded-full bg-gray-200 animate-pulse" />
        <div className="h-6 w-16 rounded-full bg-gray-200 animate-pulse" />
      </div>

      {/* Timer skeleton */}
      <div
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 space-y-6"
        aria-hidden="true"
      >
        <div className="h-6 w-1/3 rounded bg-gray-200 animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="space-y-2">
              <div className="h-5 w-40 rounded bg-gray-200 animate-pulse" />
              <div className="h-4 w-24 rounded bg-gray-100 animate-pulse" />
            </div>
            <div className="h-10 w-20 rounded bg-gray-200 animate-pulse" />
          </div>
        ))}
        <div className="h-11 w-full rounded-lg bg-gray-100 animate-pulse" />
      </div>

      <p className="sr-only">Chargement de l&apos;entraînement en cours…</p>
    </div>
  );
}
