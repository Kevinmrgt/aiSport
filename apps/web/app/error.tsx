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
    console.error('[ErrorBoundary]', error.digest ?? 'unknown');
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p aria-hidden="true" className="text-6xl font-bold text-zinc-100 mb-6 select-none">!</p>
      <h1 className="text-xl font-bold text-zinc-900 mb-2">Une erreur est survenue</h1>
      <p className="text-sm text-zinc-500 mb-8 max-w-sm">
        Quelque chose s&apos;est mal passé. Réessayez ou retournez à l&apos;accueil.
      </p>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center px-5 py-2 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-5 py-2 rounded-md border border-zinc-300 text-zinc-900 text-sm font-medium hover:bg-zinc-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2"
        >
          Accueil
        </Link>
      </div>
    </div>
  );
}
