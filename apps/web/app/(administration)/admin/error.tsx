'use client';
import { Button } from '@/components/ui/Button';
export default function AdminError({ reset }: { reset: () => void }) {
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
