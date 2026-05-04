import Link from 'next/link';
import type { ProgramListItem } from '@sportcoach/shared';
import { DeleteProgramButton } from './DeleteProgramButton';

interface ProgramCardProps {
  program: ProgramListItem;
  onDelete: (id: string) => Promise<void>;
}

const DIFFICULTY_LABELS: Record<ProgramListItem['difficulty'], string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};

// RGAA 4.1: role="article" sur chaque item, lien avec aria-label explicite
export function ProgramCard({ program, onDelete }: ProgramCardProps) {
  const createdAt = new Date(program.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <li role="article" className="surface-soft flex min-w-0 flex-col items-stretch gap-4 p-4 transition hover:border-primary-300/40 hover:bg-white/[0.08] sm:flex-row sm:items-center">
      <Link
        href={`/programs/${program.id}`}
        aria-label={`Voir le programme : ${program.title}`}
        className="w-full flex-1 min-w-0 group"
      >
        <div className="mb-3 inline-flex rounded-full bg-primary-300 px-3 py-1 text-xs font-black text-zinc-950">
          {DIFFICULTY_LABELS[program.difficulty]}
        </div>
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="truncate text-lg font-black text-white transition-colors group-hover:text-primary-200">
            {program.title}
          </h2>
        </div>
        <p className="mt-1 break-words text-sm leading-5 text-zinc-400">
          <span className="capitalize">{program.sport}</span> · {program.weeksCount} sem · {program.sessionsPerWeek} séances/sem · {program.sessionDurationMinutes} min · {createdAt}
        </p>
      </Link>

      <div className="flex w-full shrink-0 flex-wrap items-center justify-between gap-3 sm:w-auto sm:flex-nowrap sm:justify-end">
        <DeleteProgramButton
          programId={program.id}
          programTitle={program.title}
          onDelete={onDelete}
        />
        <span aria-hidden="true" className="select-none text-2xl text-primary-300">›</span>
      </div>
    </li>
  );
}
