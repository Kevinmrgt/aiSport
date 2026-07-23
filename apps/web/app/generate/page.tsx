import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { WorkoutForm } from '@/components/WorkoutForm';
import { GlassPanel, MetricPill, ProgressRing } from '@/components/PremiumPrimitives';
import { serverApi } from '@/lib/server-api';
import type { GenerateWorkoutInput } from '@alcide/shared';

export default async function GeneratePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
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
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <header className="abstract-surface mobile-compact-header rounded-[2.4rem] border border-white/[0.15] bg-zinc-950/50 p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl lg:sticky lg:top-8 lg:min-h-[42rem] lg:p-6">
        <div className="flex flex-col gap-5 lg:min-h-[32rem] lg:justify-between">
          <div>
            <p className="section-kicker mb-4">Atelier seance</p>
            <h1 className="page-title">Creer une seance sur mesure</h1>
            <p className="muted-copy mt-4 max-w-md">
              Renseignez le sport, le niveau, la duree et le contexte. Alcide transforme le brief en
              routine executable avec timer.
            </p>
          </div>

          <GlassPanel className="mobile-header-metrics mt-8 space-y-5 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
                  Focus
                </p>
                <p className="mt-2 text-2xl font-black text-white">Session du jour</p>
              </div>
              <ProgressRing value={62} label="pret" />
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <MetricPill icon="activity" label="Sport" value="Libre" />
              <MetricPill icon="target" label="Objectif" value="Precis" tone="lime" />
              <MetricPill icon="timer" label="Timer" value="Inclus" tone="orange" />
            </div>
          </GlassPanel>
        </div>
      </header>

      <WorkoutForm onSubmit={handleGenerate} generationQuota={generationQuota} />
    </div>
  );
}
