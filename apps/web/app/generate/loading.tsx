// RGAA 4.1: état de chargement accessible
export default function GenerateLoading() {
  return (
    <div
      className="flex flex-col items-center py-8"
      aria-busy="true"
      aria-label="Chargement du formulaire de génération"
    >
      <div className="h-9 w-72 rounded bg-gray-200 animate-pulse mb-8" aria-hidden="true" />

      <div className="w-full max-w-lg space-y-6" aria-hidden="true">
        {/* Champs skeleton */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
            <div className="h-10 w-full rounded-lg bg-gray-200 animate-pulse" />
          </div>
        ))}
        {/* Bouton skeleton */}
        <div className="h-11 w-full rounded-lg bg-primary-200 animate-pulse" />
      </div>

      <p className="sr-only">Chargement du formulaire en cours…</p>
    </div>
  );
}
