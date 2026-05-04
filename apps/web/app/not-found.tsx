import Link from 'next/link';

// RGAA 4.1: page 404 accessible avec message explicite et action claire
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p aria-hidden="true" className="mb-6 select-none text-7xl font-black tabular-nums text-primary-300">
        404
      </p>
      <h1 className="mb-2 text-2xl font-black text-white">Page introuvable</h1>
      <p className="muted-copy mb-8 max-w-sm">
        Cette page n&apos;existe pas ou a été supprimée.
      </p>
      <Link
        href="/"
        className="action-primary w-full sm:w-auto"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
