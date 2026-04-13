import Link from 'next/link';

// RGAA 4.1: page 404 accessible avec message explicite et action claire
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p aria-hidden="true" className="text-8xl font-bold text-gray-200 mb-4">404</p>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Page introuvable</h1>
      <p className="text-gray-600 mb-8 max-w-sm">
        Cette page n&apos;existe pas ou a été supprimée. Vérifiez l&apos;adresse ou revenez à l&apos;accueil.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
