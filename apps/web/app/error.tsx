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
      <p aria-hidden="true" className="mb-6 select-none text-7xl font-black text-primary-300">!</p>
      <h1 className="mb-2 text-2xl font-black text-white">Une erreur est survenue</h1>
      <p className="muted-copy mb-8 max-w-sm">
        Quelque chose s&apos;est mal passé. Réessayez ou retournez à l&apos;accueil.
      </p>
      <div className="flex w-full max-w-sm flex-col items-center gap-3 sm:w-auto sm:max-w-none sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="action-primary w-full sm:w-auto"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="action-secondary w-full sm:w-auto"
        >
          Accueil
        </Link>
      </div>
    </div>
  );
}
