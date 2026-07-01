'use client';

import { useState } from 'react';
import { Icon } from './ui/Icon';

interface DeleteWorkoutButtonProps {
  workoutId: string;
  workoutTitle: string;
  onDelete: (id: string) => Promise<void>;
}

export function DeleteWorkoutButton({ workoutId, workoutTitle, onDelete }: DeleteWorkoutButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsPending(true);
    try {
      await onDelete(workoutId);
    } finally {
      setIsPending(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="flex w-full max-w-full flex-col items-stretch gap-2 rounded-[1.2rem] border border-sport-orange/30 bg-sport-orange/10 p-2 sm:max-w-sm sm:flex-row sm:items-center"
      >
        <span id="confirm-title" className="min-w-0 flex-1 break-words text-xs text-sport-orange">
          Supprimer &quot;{workoutTitle}&quot; ?
        </span>
        <button
          type="button"
          onClick={() => {
            void handleDelete();
          }}
          disabled={isPending}
          aria-busy={isPending}
          className="rounded-full bg-sport-orange px-3 py-1.5 text-xs font-black text-zinc-950 hover:bg-primary-300 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-sport-orange"
        >
          {isPending ? 'Suppression...' : 'Confirmer'}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowConfirm(false);
          }}
          disabled={isPending}
          aria-label="Annuler la suppression"
          className="rounded-full px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          Annuler
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setShowConfirm(true);
      }}
      aria-label={`Supprimer l'entrainement : ${workoutTitle}`}
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold text-zinc-500 transition-colors hover:bg-sport-orange/10 hover:text-sport-orange focus:outline-none focus:ring-2 focus:ring-sport-orange"
    >
      <Icon name="trash" className="h-3.5 w-3.5" />
      Supprimer
    </button>
  );
}
