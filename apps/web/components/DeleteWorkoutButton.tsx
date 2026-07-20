import { DeleteConfirmationButton } from './DeleteConfirmationButton';

interface DeleteWorkoutButtonProps {
  workoutId: string;
  workoutTitle: string;
  onDelete: (id: string) => Promise<{ error?: string } | void>;
}

export function DeleteWorkoutButton({
  workoutId,
  workoutTitle,
  onDelete,
}: DeleteWorkoutButtonProps) {
  return (
    <DeleteConfirmationButton
      id={workoutId}
      itemLabel={workoutTitle}
      itemType="l'entraînement"
      onDelete={onDelete}
    />
  );
}
