import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ProgramForm } from '@/components/ProgramForm';
import { GlassPanel, MetricPill, ProgressRing } from '@/components/PremiumPrimitives';
import { serverApi } from '@/lib/server-api';
import type { GenerateProgramInput } from '@alcide/shared';

export default async function GenerateProgramPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  async function handleGenerate(data: GenerateProgramInput): Promise<{ error?: string } | void> {
    'use server';
    let programId: string;
    try {
      const program = await serverApi.generateProgram(data);
      programId = program.id;
    } catch (error) {
      console.error('[GenerateProgramPage] Erreur generation programme:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      const message =
        error instanceof Error ? error.message : 'Erreur inattendue, veuillez reessayer';
      return { error: message };
    }
    redirect(`/programs/${programId}`);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <header className="abstract-surface mobile-compact-header rounded-[2.4rem] border border-white/[0.15] bg-zinc-950/50 p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl lg:sticky lg:top-8 lg:min-h-[42rem] lg:p-6">
        <div className="flex flex-col gap-5 lg:min-h-[32rem] lg:justify-between">
          <div>
            <p className="section-kicker mb-4">Planification</p>
            <h1 className="page-title">Construire un cycle progressif</h1>
            <p className="muted-copy mt-4 max-w-md">
              Un programme multi-semaines avec rythme, repos et progression pour garder une ligne
              claire entre chaque seance.
            </p>
          </div>

          <GlassPanel className="mobile-header-metrics mt-8 space-y-5 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
                  Cycle
                </p>
                <p className="mt-2 text-2xl font-black text-white">Progression guidee</p>
              </div>
              <ProgressRing value={84} label="plan" />
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <MetricPill icon="calendar" label="Duree" value="2-4 sem." />
              <MetricPill icon="activity" label="Rythme" value="2-5 /sem." tone="lime" />
              <MetricPill icon="target" label="Objectif" value="Calibre" tone="orange" />
            </div>
          </GlassPanel>
        </div>
      </header>

      <ProgramForm onSubmit={handleGenerate} />
    </div>
  );
}
