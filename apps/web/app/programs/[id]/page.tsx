import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { isServerApiNotFound, serverApi } from '@/lib/server-api';
import { ProgramWeekTabs } from '@/components/ProgramWeekTabs';
import { DeleteProgramButton } from '@/components/DeleteProgramButton';
import { GlassPanel } from '@/components/PremiumPrimitives';
import { Icon } from '@/components/ui/Icon';

interface ProgramDetailPageProps {
  params: Promise<{ id: string }>;
}

const DIFFICULTY_LABELS = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
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
  } catch (error) {
    if (isServerApiNotFound(error)) {
      notFound();
    }
    throw error;
  }

  async function handleDelete(id: string) {
    'use server';
    try {
      await serverApi.deleteProgram(id);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Impossible de supprimer le programme.',
      };
    }
    revalidatePath('/programs');
    redirect('/programs');
  }

  const totalSessions = program.data.weeks.reduce((sum, week) => sum + week.sessions.length, 0);

  return (
    <div className="detail-page space-y-7">
      <nav aria-label="Retour">
        <Link href="/programs" className="back-link">
          <Icon name="arrow-left" className="h-4 w-4" />
          Mes programmes
        </Link>
      </nav>
      <header className="page-heading block">
        <h1 className="page-title">{program.title}</h1>
        <div className="detail-meta">
          <span className="capitalize">{program.sport}</span>
          <span>{DIFFICULTY_LABELS[program.difficulty]}</span>
          <span>{program.weeksCount} semaines</span>
          <span>{program.sessionsPerWeek} séances / sem.</span>
          <span>{program.sessionDurationMinutes} min / séance</span>
        </div>
        {program.data.progression_summary && (
          <p className="muted-copy mt-5 max-w-4xl">{program.data.progression_summary}</p>
        )}
      </header>
      <section aria-labelledby="program-weeks-title">
        <GlassPanel className="panel-padding">
          <h2 id="program-weeks-title" className="panel-title">
            {totalSessions} séance{totalSessions > 1 ? 's' : ''} planifiée
            {totalSessions > 1 ? 's' : ''}
          </h2>
          <ProgramWeekTabs weeks={program.data.weeks} programId={program.id} />
        </GlassPanel>
      </section>
      <div className="flex justify-end">
        <DeleteProgramButton
          programId={program.id}
          programTitle={program.title}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
