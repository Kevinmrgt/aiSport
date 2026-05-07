import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import { ProgramWeekTabs } from '@/components/ProgramWeekTabs';
import { DeleteProgramButton } from '@/components/DeleteProgramButton';

interface ProgramDetailPageProps {
  params: Promise<{ id: string }>;
}

const DIFFICULTY_LABELS = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};

// OWASP A01: route protégée + ownership vérifié côté backend
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

  // Server Action : suppression avec ownership vérifié côté backend (OWASP A01)
  async function handleDelete(id: string) {
    'use server';
    await serverApi.deleteProgram(id);
    revalidatePath('/programs');
    redirect('/programs');
  }

  const totalSessions = program.data.weeks.reduce(
    (sum, week) => sum + week.sessions.length,
    0,
  );

  return (
    <div className="mx-auto max-w-3xl">
      {/* RGAA 4.1: lien de retour */}
      <nav aria-label="Retour" className="mb-8">
        <Link
          href="/programs"
          className="text-sm font-semibold text-zinc-400 transition-colors hover:text-primary-300 focus-visible:outline-none focus-visible:underline"
        >
          Mes programmes
        </Link>
      </nav>

      {/* En-tête */}
      <header className="surface mb-6 p-5 sm:p-6">
        <p className="section-kicker mb-2">Programme</p>
        <h1 className="page-title">{program.title}</h1>
        <p className="mt-3 break-words text-sm leading-5 text-zinc-400">
          {program.sport} · {DIFFICULTY_LABELS[program.difficulty]} ·{' '}
          {program.weeksCount} semaines · {program.sessionsPerWeek} séances/sem ·{' '}
          {program.sessionDurationMinutes} min/séance
        </p>
      </header>

      {/* Résumé de progression */}
      {program.data.progression_summary && (
        <section className="surface-soft mb-8 p-4">
          <p className="text-sm leading-6 text-zinc-300">{program.data.progression_summary}</p>
        </section>
      )}

      {/* Navigation par semaine avec séances */}
      <section aria-labelledby="program-weeks-title" className="surface p-5 sm:p-6">
        <h2
          id="program-weeks-title"
          className="section-kicker mb-4"
        >
          Programme — {totalSessions} séance{totalSessions > 1 ? 's' : ''}
        </h2>
        <ProgramWeekTabs weeks={program.data.weeks} programId={program.id} />
      </section>

      {/* Suppression */}
      <div className="mt-6 border-t border-white/10 pt-6">
        <DeleteProgramButton
          programId={program.id}
          programTitle={program.title}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
