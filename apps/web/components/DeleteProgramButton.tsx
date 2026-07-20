import { DeleteConfirmationButton } from './DeleteConfirmationButton';

interface DeleteProgramButtonProps {
  programId: string;
  programTitle: string;
  onDelete: (id: string) => Promise<{ error?: string } | void>;
}

export function DeleteProgramButton({
  programId,
  programTitle,
  onDelete,
}: DeleteProgramButtonProps) {
  return (
    <DeleteConfirmationButton
      id={programId}
      itemLabel={programTitle}
      itemType="le programme"
      onDelete={onDelete}
    />
  );
}
