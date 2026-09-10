import Link from 'next/link';
import type { WorkoutListItem } from '@alcide/shared';
import { DeleteWorkoutButton } from './DeleteWorkoutButton';
import { Icon } from './ui/Icon';

interface WorkoutCardProps {
  workout: WorkoutListItem;
  onDelete: (id: string) => Promise<{ error?: string } | void>;
}

const DIFFICULTY_LABELS: Record<WorkoutListItem['difficulty'], string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};

export function WorkoutCard({ workout, onDelete }: WorkoutCardProps) {
  const createdAt = new Date(workout.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <li role="article" className="workout-row">
      <Link
        href={`/workouts/${workout.id}`}
        aria-label={`Voir l'entrainement : ${workout.title}`}
        className="workout-row-title"
      >
        <span className="icon-bubble">
          <Icon
            name={/course|run|endurance/i.test(workout.sport) ? 'run' : 'barbell'}
            className="h-6 w-6"
          />
        </span>
        <span>
          <h2 className="break-words">{workout.title}</h2>
          <span className="muted-copy capitalize">{workout.sport}</span>
        </span>
      </Link>
      <span className="row-level">{DIFFICULTY_LABELS[workout.difficulty]}</span>
      <span className="row-duration">~{workout.durationMinutes} min</span>
      <time className="row-date" dateTime={workout.createdAt}>
        {createdAt}
      </time>
      <div className="row-actions">
        <Link
          href={`/workouts/${workout.id}`}
          className="icon-button"
          aria-label={`Ouvrir ${workout.title}`}
        >
          <Icon name="arrow-right" className="h-5 w-5" />
        </Link>
        <DeleteWorkoutButton
          workoutId={workout.id}
          workoutTitle={workout.title}
          onDelete={onDelete}
        />
      </div>
    </li>
  );
}
