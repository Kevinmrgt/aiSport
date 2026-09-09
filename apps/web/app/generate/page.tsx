import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { WorkoutForm } from '@/components/WorkoutForm';
import { serverApi } from '@/lib/server-api';
import type { GenerateWorkoutInput } from '@alcide/shared';

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ goal?: string; duration?: string }>;
}) {
  const query = await searchParams;
  const duration = Number(query.duration);
  const initialValues = {
    goals: typeof query.goal === 'string' ? query.goal.slice(0, 500) : '',
    duration_minutes:
      Number.isInteger(duration) && duration >= 15 && duration <= 180 ? duration : 30,
  };
  const destination =
    '/generate?' +
    new URLSearchParams({
      goal: initialValues.goals,
      duration: String(initialValues.duration_minutes),
    }).toString();
  const session = await auth();

  if (!session?.user) {
    redirect('/login?' + new URLSearchParams({ callbackUrl: destination }).toString());
  }

  const generationQuota = await serverApi.getGenerationQuota();

  async function handleGenerate(data: GenerateWorkoutInput): Promise<{ error?: string } | void> {
    'use server';
    let workoutId: string;
    try {
      const workout = await serverApi.generateWorkout(data);
      workoutId = workout.id;
    } catch (error) {
      console.error('[GeneratePage] Erreur generation entrainement:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      const message =
        error instanceof Error ? error.message : 'Erreur inattendue, veuillez reessayer';
      return { error: message };
    }
    redirect(`/workouts/${workoutId}`);
  }

  return (
    <section className="form-page">
      <header className="page-heading">
        <h1 className="page-title">Créer une séance</h1>
      </header>
      <WorkoutForm
        onSubmit={handleGenerate}
        generationQuota={generationQuota}
        initialValues={initialValues}
      />
    </section>
  );
}
