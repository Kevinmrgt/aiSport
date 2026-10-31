'use client';

import { useEffect } from 'react';
import { reportBrowserIncident } from '@/lib/browser-incidents';

// This boundary replaces the root layout, so it owns the complete document.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportBrowserIncident('react_boundary');
  }, []);
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          background: '#102019',
          color: '#f3f7ef',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <main
          style={{ maxWidth: '40rem', margin: '0 auto', padding: '4rem 1.5rem', lineHeight: 1.6 }}
        >
          <h1>Une erreur est survenue</h1>
          <p>L’application n’a pas pu s’afficher. Réessayez dans quelques instants.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '0.8rem 1.2rem',
              margin: '1rem 1rem 1rem 0',
              font: 'inherit',
              cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- A root-layout failure needs a full document navigation. */}
          <a href="/" style={{ color: '#e4f4cb' }}>
            Revenir à l’accueil
          </a>
        </main>
      </body>
    </html>
  );
}
