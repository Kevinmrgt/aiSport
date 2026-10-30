import Link from 'next/link';
import type { ProgramListItem } from '@alcide/shared';
import { DeleteProgramButton } from './DeleteProgramButton';
import { Icon } from './ui/Icon';

interface ProgramCardProps {
  program: ProgramListItem;
  onDelete: (id: string) => Promise<{ error?: string } | void>;
}

const DIFFICULTY_LABELS: Record<ProgramListItem['difficulty'], string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};

export function ProgramCard({ program, onDelete }: ProgramCardProps) {
  const createdAt = new Date(program.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <li role="article" className="glass-panel program-row">
      <div className="min-w-0 flex-1">
        <Link
          href={`/programs/${program.id}`}
          aria-label={`Voir le programme : ${program.title}`}
          className="workout-row-title"
        >
          <span className="icon-bubble">
            <Icon name="barbell" className="h-6 w-6" />
          </span>
          <span>
            <h2 className="break-words">{program.title}</h2>
            <span className="muted-copy">
              <span className="capitalize">{program.sport}</span> ·{' '}
              {DIFFICULTY_LABELS[program.difficulty]}
            </span>
          </span>
        </Link>
        <dl className="program-row-meta">
          <div>
            <dt>Durée</dt>
            <dd>{program.weeksCount} semaines</dd>
          </div>
          <div>
            <dt>Rythme</dt>
            <dd>{program.sessionsPerWeek} séances / sem.</dd>
          </div>
          <div>
            <dt>Par séance</dt>
            <dd>{program.sessionDurationMinutes} min</dd>
          </div>
          <div>
            <dt>Créé le</dt>
            <dd>
              <time dateTime={program.createdAt}>{createdAt}</time>
            </dd>
          </div>
        </dl>
      </div>
      <div className="row-actions">
        <Link href={`/programs/${program.id}`} className="action-secondary">
          Voir le programme <Icon name="arrow-right" className="h-4 w-4" />
        </Link>
        <DeleteProgramButton
          programId={program.id}
          programTitle={program.title}
          onDelete={onDelete}
        />
      </div>
    </li>
  );
}
