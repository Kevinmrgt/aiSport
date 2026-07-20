import Link from 'next/link';
import type { ProgramListItem } from '@alcide/shared';
import { DeleteProgramButton } from './DeleteProgramButton';
import { Icon } from './ui/Icon';

interface ProgramCardProps {
  program: ProgramListItem;
  onDelete: (id: string) => Promise<{ error?: string } | void>;
}

const DIFFICULTY_LABELS: Record<ProgramListItem['difficulty'], string> = {
  beginner: 'Debutant',
  intermediate: 'Intermediaire',
  advanced: 'Avance',
};

export function ProgramCard({ program, onDelete }: ProgramCardProps) {
  const createdAt = new Date(program.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <li
      role="article"
      className="glass-soft group relative min-w-0 overflow-hidden p-4 transition hover:border-primary-300/[0.45] hover:bg-zinc-950/[0.72]"
    >
      <Link
        href={`/programs/${program.id}`}
        aria-label={`Voir le programme : ${program.title}`}
        className="block min-w-0"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="premium-chip bg-primary-300 text-zinc-950">
                {DIFFICULTY_LABELS[program.difficulty]}
              </span>
              <span className="premium-chip capitalize">{program.sport}</span>
            </div>
            <h2 className="truncate text-xl font-black text-white transition-colors group-hover:text-primary-200">
              {program.title}
            </h2>
          </div>
          <span aria-hidden="true" className="icon-bubble h-11 w-11 text-primary-300">
            <Icon name="arrow-right" className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-full bg-zinc-950/[0.46] px-3 py-2">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-300">
              Cycle
            </p>
            <p className="text-sm font-black text-white">{program.weeksCount} sem.</p>
          </div>
          <div className="rounded-full bg-zinc-950/[0.46] px-3 py-2">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-300">
              Rythme
            </p>
            <p className="text-sm font-black text-white">{program.sessionsPerWeek}/sem.</p>
          </div>
          <div className="rounded-full bg-zinc-950/[0.46] px-3 py-2">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-300">
              Seance
            </p>
            <p className="text-sm font-black text-white">{program.sessionDurationMinutes} min</p>
          </div>
          <div className="rounded-full border border-primary-300/[0.18] bg-zinc-950/[0.46] px-3 py-2">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-300">
              Cree
            </p>
            <p className="text-sm font-black text-primary-200">{createdAt}</p>
          </div>
        </div>
      </Link>

      <div className="mt-4 flex justify-end border-t border-white/10 pt-3">
        <DeleteProgramButton
          programId={program.id}
          programTitle={program.title}
          onDelete={onDelete}
        />
      </div>
    </li>
  );
}
