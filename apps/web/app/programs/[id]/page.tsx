import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import { ProgramWeekTabs } from '@/components/ProgramWeekTabs';
import { DeleteProgramButton } from '@/components/DeleteProgramButton';
import { GlassPanel, MetricPill } from '@/components/PremiumPrimitives';
import { Icon } from '@/components/ui/Icon';

interface ProgramDetailPageProps {
  params: Promise<{ id: string }>;
}

const DIFFICULTY_LABELS = {
  beginner: 'Debutant',
  intermediate: 'Intermediaire',
  advanced: 'Avance',
};

export default async function ProgramDetailPage({ params }: ProgramDetailPageProps) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  let program: Awaited<ReturnType<typeof serverApi.getProgram>>;
  try {
    program = await serverApi.getProgram(id);
  } catch {
    notFound();
  }

  async function handleDelete(id: string) {
    'use server';
    await serverApi.deleteProgram(id);
    revalidatePath('/programs');
    redirect('/programs');
  }

  const totalSessions = program.data.weeks.reduce((sum, week) => sum + week.sessions.length, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <nav aria-label="Retour">
        <Link href="/programs" className="premium-chip">
          <Icon name="arrow-left" className="h-4 w-4" />
          Mes programmes
        </Link>
      </nav>

      <header className="abstract-surface mobile-compact-header rounded-[2.4rem] border border-white/[0.15] bg-zinc-950/50 p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-6">
        <p className="section-kicker mb-4">Programme</p>
        <h1 className="page-title max-w-3xl">{program.title}</h1>
        <div className="mobile-header-metrics mt-6 grid gap-2 sm:grid-cols-4">
          <MetricPill icon="activity" label="Sport" value={program.sport} tone="lime" />
          <MetricPill
            icon="target"
            label="Niveau"
            value={DIFFICULTY_LABELS[program.difficulty]}
          />
          <MetricPill icon="calendar" label="Cycle" value={`${program.weeksCount} sem.`} tone="orange" />
          <MetricPill icon="timer" label="Seance" value={`${program.sessionDurationMinutes} min`} />
        </div>
      </header>

      {program.data.progression_summary && (
        <GlassPanel variant="soft" className="p-5">
          <p className="text-sm leading-6 text-zinc-200">{program.data.progression_summary}</p>
        </GlassPanel>
      )}

      <section aria-labelledby="program-weeks-title">
        <GlassPanel className="p-5 sm:p-6">
          <h2 id="program-weeks-title" className="section-kicker mb-6">
            {totalSessions} seance{totalSessions > 1 ? 's' : ''} planifiee{totalSessions > 1 ? 's' : ''}
          </h2>
          <ProgramWeekTabs weeks={program.data.weeks} programId={program.id} />
        </GlassPanel>
      </section>

      <div className="border-t border-white/10 pt-6">
        <DeleteProgramButton
          programId={program.id}
          programTitle={program.title}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
