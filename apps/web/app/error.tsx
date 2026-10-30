'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// OWASP A09: ne pas exposer les details d'erreur internes cote client.
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[ErrorBoundary]', error.digest ?? 'unknown');
  }, [error]);

  return (
    <div className="glass-panel mx-auto grid min-h-[60vh] max-w-3xl place-items-center p-8 text-center">
      <div className="max-w-md">
        <p
          aria-hidden="true"
          className="mx-auto mb-6 grid h-20 w-20 select-none place-items-center rounded-full border border-sport-orange/30 bg-sport-orange/10 text-5xl font-black text-sport-orange shadow-2xl shadow-black/30"
        >
          !
        </p>
        <h1 className="text-3xl font-black text-white">Une erreur est survenue</h1>
        <p className="muted-copy mx-auto mt-4">
          Quelque chose s&apos;est mal passe. Reessayez ou revenez a l&apos;accueil.
        </p>
        <div className="mt-8 flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={reset} className="action-primary w-full sm:w-auto">
            Reessayer
          </button>
          <Link href="/" className="action-secondary w-full sm:w-auto">
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
