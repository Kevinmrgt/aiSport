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
    <li role="article" className="flex items-center gap-4 py-4">
      <Link
        href={`/programs/${program.id}`}
        aria-label={`Voir le programme : ${program.title}`}
        className="flex-1 min-w-0 group"
      >
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="text-sm font-medium text-zinc-900 truncate group-hover:text-zinc-600 transition-colors">
            {program.title}
          </h2>
          <span className="text-xs text-zinc-400 shrink-0">
            {DIFFICULTY_LABELS[program.difficulty]}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-zinc-400">
          {program.sport} · {program.weeksCount} sem · {program.sessionsPerWeek} séances/sem · {program.sessionDurationMinutes} min · {createdAt}
        </p>
      </Link>

      <div className="flex items-center gap-3 shrink-0">
        <DeleteProgramButton
          programId={program.id}
          programTitle={program.title}
          onDelete={onDelete}
        />
        <span aria-hidden="true" className="text-zinc-300 text-base select-none">›</span>
      </div>
    </li>
  );
}
