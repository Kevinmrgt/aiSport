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
    <li role="article" className="flex items-center gap-4 py-4">
      <Link
        href={`/workouts/${workout.id}`}
        aria-label={`Voir l'entraînement : ${workout.title}`}
        className="flex-1 min-w-0 group"
      >
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="text-sm font-medium text-zinc-900 truncate group-hover:text-zinc-600 transition-colors">
            {workout.title}
          </h2>
          <span className="text-xs text-zinc-400 shrink-0">
            {DIFFICULTY_LABELS[workout.difficulty]}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-zinc-400">
          {workout.sport} · {workout.durationMinutes} min · {createdAt}
        </p>
      </Link>

      <div className="flex items-center gap-3 shrink-0">
        <DeleteWorkoutButton
          workoutId={workout.id}
          workoutTitle={workout.title}
          onDelete={onDelete}
        />
        <span aria-hidden="true" className="text-zinc-300 text-base select-none">›</span>
      </div>
    </li>
  );
}
