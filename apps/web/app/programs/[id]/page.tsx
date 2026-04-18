import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import { ProgramWeekTabs } from '@/components/ProgramWeekTabs';
import { DeleteProgramButton } from '@/components/DeleteProgramButton';

interface ProgramDetailPageProps {
  params: { id: string };
}

const DIFFICULTY_LABELS = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};

// OWASP A01: route protégée + ownership vérifié côté backend
export default async function ProgramDetailPage({ params }: ProgramDetailPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  let program: Awaited<ReturnType<typeof serverApi.getProgram>>;
  try {
    program = await serverApi.getProgram(params.id);
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
    <div className="max-w-2xl mx-auto">
      {/* RGAA 4.1: lien de retour */}
      <nav aria-label="Retour" className="mb-8">
        <Link
          href="/programs"
          className="text-sm text-zinc-400 hover:text-zinc-900 transition-colors focus-visible:outline-none focus-visible:underline"
        >
          ← Mes programmes
        </Link>
      </nav>

      {/* En-tête */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">{program.title}</h1>
        <p className="text-sm text-zinc-400">
          {program.sport} · {DIFFICULTY_LABELS[program.difficulty]} ·{' '}
          {program.weeksCount} semaines · {program.sessionsPerWeek} séances/sem ·{' '}
          {program.sessionDurationMinutes} min/séance
        </p>
      </header>

      {/* Résumé de progression */}
      {program.data.progression_summary && (
        <section className="mb-8 p-4 bg-zinc-50 rounded-lg border border-zinc-100">
          <p className="text-sm text-zinc-600">{program.data.progression_summary}</p>
        </section>
      )}

      {/* Navigation par semaine avec séances */}
      <section aria-labelledby="program-weeks-title">
        <h2
          id="program-weeks-title"
          className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4"
        >
          Programme — {totalSessions} séance{totalSessions > 1 ? 's' : ''}
        </h2>
        <ProgramWeekTabs weeks={program.data.weeks} programId={program.id} />
      </section>

      {/* Suppression */}
      <div className="mt-12 pt-6 border-t border-zinc-100">
        <DeleteProgramButton
          programId={program.id}
          programTitle={program.title}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
