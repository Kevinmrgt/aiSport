// RGAA 4.1: état de chargement accessible
export default function GenerateLoading() {
  return (
    <div
      className="surface mx-auto max-w-lg p-6"
      aria-busy="true"
      aria-label="Chargement du formulaire de génération"
    >
      <div className="mb-8 h-8 w-64 animate-pulse rounded bg-white/10" aria-hidden="true" />

      <div className="space-y-6" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
            <div className="h-9 w-full animate-pulse rounded-lg bg-white/10" />
          </div>
        ))}
        <div className="h-10 w-full animate-pulse rounded-full bg-primary-300/25" />
      </div>

      <p className="sr-only">Chargement du formulaire en cours…</p>
    </div>
  );
}
