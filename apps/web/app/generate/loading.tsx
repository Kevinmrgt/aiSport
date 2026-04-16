// RGAA 4.1: état de chargement accessible
export default function GenerateLoading() {
  return (
    <div
      className="max-w-lg mx-auto"
      aria-busy="true"
      aria-label="Chargement du formulaire de génération"
    >
      <div className="h-8 w-64 rounded bg-zinc-100 animate-pulse mb-8" aria-hidden="true" />

      <div className="space-y-6" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 w-20 rounded bg-zinc-100 animate-pulse" />
            <div className="h-9 w-full rounded-md bg-zinc-100 animate-pulse" />
          </div>
        ))}
        <div className="h-10 w-full rounded-md bg-zinc-100 animate-pulse" />
      </div>

      <p className="sr-only">Chargement du formulaire en cours…</p>
    </div>
  );
}
