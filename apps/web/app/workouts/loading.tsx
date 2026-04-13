// RGAA 4.1: état de chargement accessible via aria-busy
export default function WorkoutsLoading() {
  return (
    <section aria-labelledby="workouts-title" aria-busy="true">
      <div className="flex items-center justify-between mb-8">
        <h1 id="workouts-title" className="text-3xl font-bold text-gray-900">
          Mes entraînements
        </h1>
        {/* Bouton skeleton */}
        <div className="h-9 w-40 rounded-lg bg-gray-200 animate-pulse" aria-hidden="true" />
      </div>

      <ul
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Chargement des entraînements"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3"
            aria-hidden="true"
          >
            {/* Titre skeleton */}
            <div className="h-5 w-3/4 rounded bg-gray-200 animate-pulse" />
            {/* Badges skeleton */}
            <div className="flex gap-2">
              <div className="h-5 w-16 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-5 w-20 rounded-full bg-gray-200 animate-pulse" />
            </div>
            {/* Durée skeleton */}
            <div className="h-4 w-1/3 rounded bg-gray-200 animate-pulse" />
            {/* Bouton skeleton */}
            <div className="h-8 w-full rounded-lg bg-gray-100 animate-pulse mt-2" />
          </li>
        ))}
      </ul>

      {/* Message SR uniquement */}
      <p className="sr-only">Chargement de vos entraînements en cours…</p>
    </section>
  );
}
