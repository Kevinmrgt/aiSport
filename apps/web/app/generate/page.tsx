import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { WorkoutForm } from '@/components/WorkoutForm';
import { serverApi } from '@/lib/server-api';
import type { GenerateWorkoutInput } from '@sportcoach/shared';

// OWASP A01: route protégée — redirection si pas de session
export default async function GeneratePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Server Action : s'exécute côté serveur, pas d'exposition de token au client.
  // Pattern : try-catch retourne l'erreur au lieu de throw — en production Next.js
  // remplace le message de tout throw par un message générique, rendant l'erreur
  // illisible côté client. On sépare la gestion d'erreur du redirect (qui utilise
  // lui-même un throw interne Next.js et doit rester hors du try-catch).
  async function handleGenerate(data: GenerateWorkoutInput): Promise<{ error?: string } | void> {
    'use server';
    let workoutId: string;
    try {
      const workout = await serverApi.generateWorkout(data);
      workoutId = workout.id;
    } catch (error) {
      // OWASP A09: logger l'erreur réelle côté serveur (visible dans les logs Vercel/Railway)
      console.error('[GeneratePage] Erreur génération entraînement:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      const message =
        error instanceof Error ? error.message : 'Erreur inattendue, veuillez réessayer';
      return { error: message };
    }
    // redirect() est en dehors du try-catch — il throw une erreur interne Next.js
    // (NEXT_REDIRECT) qui ne doit pas être interceptée par notre catch
    redirect(`/workouts/${workoutId}`);
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 mb-8">Générer un entraînement</h1>
      <WorkoutForm onSubmit={handleGenerate} />
    </div>
  );
}
