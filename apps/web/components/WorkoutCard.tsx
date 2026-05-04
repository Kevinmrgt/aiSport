import Link from 'next/link';
import type { WorkoutListItem } from '@sportcoach/shared';
import { DeleteWorkoutButton } from './DeleteWorkoutButton';

interface WorkoutCardProps {
  workout: WorkoutListItem;
  onDelete: (id: string) => Promise<void>;
}

const DIFFICULTY_LABELS: Record<WorkoutListItem['difficulty'], string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};

// RGAA 4.1: role="article" sur chaque item, lien avec aria-label explicite
export function WorkoutCard({ workout, onDelete }: WorkoutCardProps) {
  const createdAt = new Date(workout.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <li role="article" className="surface-soft flex min-w-0 flex-col items-stretch gap-4 p-4 transition hover:border-primary-300/40 hover:bg-white/[0.08] sm:flex-row sm:items-center">
      <Link
        href={`/workouts/${workout.id}`}
        aria-label={`Voir l'entraînement : ${workout.title}`}
        className="w-full flex-1 min-w-0 group"
      >
        <div className="mb-3 inline-flex rounded-full bg-primary-300 px-3 py-1 text-xs font-black text-zinc-950">
          {DIFFICULTY_LABELS[workout.difficulty]}
        </div>
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="truncate text-lg font-black text-white transition-colors group-hover:text-primary-200">
            {workout.title}
          </h2>
        </div>
        <p className="mt-1 break-words text-sm leading-5 text-zinc-400">
          <span className="capitalize">{workout.sport}</span> · {workout.durationMinutes} min · {createdAt}
        </p>
      </Link>

      <div className="flex w-full shrink-0 flex-wrap items-center justify-between gap-3 sm:w-auto sm:flex-nowrap sm:justify-end">
        <DeleteWorkoutButton
          workoutId={workout.id}
          workoutTitle={workout.title}
          onDelete={onDelete}
        />
        <span aria-hidden="true" className="select-none text-2xl text-primary-300">›</span>
      </div>
    </li>
  );
}
