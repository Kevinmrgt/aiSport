import Link from 'next/link';

// RGAA 4.1: page 404 accessible avec message explicite et action claire
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p aria-hidden="true" className="text-6xl font-bold text-zinc-100 mb-6 select-none tabular-nums">
        404
      </p>
      <h1 className="text-xl font-bold text-zinc-900 mb-2">Page introuvable</h1>
      <p className="text-sm text-zinc-500 mb-8 max-w-sm">
        Cette page n&apos;existe pas ou a été supprimée.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center px-5 py-2 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
