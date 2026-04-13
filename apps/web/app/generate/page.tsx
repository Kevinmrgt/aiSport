import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { WorkoutForm } from '@/components/WorkoutForm';

// OWASP A01: route protégée — redirection si pas de session
export default async function GeneratePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="flex flex-col items-center py-8">
      <WorkoutFormWrapper />
    </div>
  );
}

// Composant séparé pour permettre l'utilisation de 'use client' dans WorkoutForm
function WorkoutFormWrapper() {
  // L'action de soumission sera gérée via l'API client dans WorkoutForm
  // Le sessionToken est passé via les headers (OWASP A01)
  return (
    <WorkoutForm
      onSubmit={async (data) => {
        'use server';
        // La génération est gérée côté client dans WorkoutForm via api-client
        // Cette action server-side sert de fallback
        console.info('[Generate] Données reçues:', data);
      }}
    />
  );
}
