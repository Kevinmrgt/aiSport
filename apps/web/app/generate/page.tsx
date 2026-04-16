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
    redirect(`/workouts/${workout.id}`);
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 mb-8">Générer un entraînement</h1>
      <WorkoutForm onSubmit={handleGenerate} />
    </div>
  );
}
