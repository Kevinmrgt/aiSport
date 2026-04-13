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

  // Server Action : s'exécute côté serveur, pas d'exposition de token au client
  async function handleGenerate(data: GenerateWorkoutInput) {
    'use server';
    const workout = await serverApi.generateWorkout(data);
    // Redirection vers le détail du workout généré
    redirect(`/workouts/${workout.id}`);
  }

  return (
    <div className="flex flex-col items-center py-8">
      <div className="w-full max-w-lg mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Générer un entraînement</h1>
        <p className="text-gray-600">
          Décrivez votre séance et l&apos;IA crée un programme personnalisé en quelques secondes.
        </p>
      </div>
      <WorkoutForm onSubmit={handleGenerate} />
    </div>
  );
}
