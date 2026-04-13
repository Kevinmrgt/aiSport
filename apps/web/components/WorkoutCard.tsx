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

const DIFFICULTY_CLASSES: Record<WorkoutListItem['difficulty'], string> = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
};

// RGAA 4.1: role="article" sur chaque carte, lien avec aria-label explicite
export function WorkoutCard({ workout, onDelete }: WorkoutCardProps) {
  const createdAt = new Date(workout.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <li role="article" className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-5">
        <Link
          href={`/workouts/${workout.id}`}
          aria-label={`Voir l'entraînement : ${workout.title}`}
          className="block focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="text-base font-semibold text-gray-900 line-clamp-2 leading-snug">
              {workout.title}
            </h2>
            <span
              className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${DIFFICULTY_CLASSES[workout.difficulty]}`}
              aria-label={`Niveau : ${DIFFICULTY_LABELS[workout.difficulty]}`}
            >
              {DIFFICULTY_LABELS[workout.difficulty]}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{workout.sport}</span>
            <span aria-hidden="true">·</span>
            <span>{workout.durationMinutes} min</span>
          </div>

          <p className="text-xs text-gray-400 mt-3">Créé le {createdAt}</p>
        </Link>

        {/* Bouton supprimer séparé du lien — RGAA 4.1 */}
        <div className="mt-3 pt-3 border-t border-gray-50 flex justify-end">
          <DeleteWorkoutButton
            workoutId={workout.id}
            workoutTitle={workout.title}
            onDelete={onDelete}
          />
        </div>
      </div>
    </li>
  );
}
