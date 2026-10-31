'use client';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { reportBrowserIncident } from '@/lib/browser-incidents';
export default function AdminError({ reset }: { reset: () => void }) {
  useEffect(() => {
    reportBrowserIncident('react_boundary');
  }, []);
  return (
    <section className="admin-panel" role="alert">
      <h1>Chargement impossible</h1>
      <p className="muted-copy my-4">
        Les données n’ont pas pu être récupérées. Réessayez dans quelques instants.
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </section>
  );
}
