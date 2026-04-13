'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// OWASP A09: ne pas exposer les détails d'erreur internes côté client
// RGAA 4.1: page d'erreur accessible avec actions explicites
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log côté client pour le monitoring (digest uniquement — pas les détails)
    console.error('[ErrorBoundary]', error.digest ?? 'unknown');
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p aria-hidden="true" className="text-8xl font-bold text-gray-200 mb-4">!</p>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Une erreur est survenue</h1>
      <p className="text-gray-600 mb-8 max-w-sm">
        Quelque chose s&apos;est mal passé. Vous pouvez réessayer ou retourner à l&apos;accueil.
      </p>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
        >
          Accueil
        </Link>
      </div>
    </div>
  );
}
