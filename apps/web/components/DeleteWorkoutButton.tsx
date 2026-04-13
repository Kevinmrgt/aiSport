'use client';

import { useState } from 'react';

interface DeleteWorkoutButtonProps {
  workoutId: string;
  workoutTitle: string;
  onDelete: (id: string) => Promise<void>;
}

// RGAA 4.1: bouton de suppression accessible avec confirmation explicite
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
        className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200"
      >
        <span id="confirm-title" className="text-xs text-red-700 flex-1">
          Supprimer &laquo;{workoutTitle}&raquo; ?
        </span>
        <button
          type="button"
          onClick={() => { void handleDelete(); }}
          disabled={isPending}
          aria-busy={isPending}
          className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          {isPending ? 'Suppression…' : 'Confirmer'}
        </button>
        <button
          type="button"
          onClick={() => { setShowConfirm(false); }}
          disabled={isPending}
          aria-label="Annuler la suppression"
          className="text-xs px-2 py-1 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded"
        >
          Annuler
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setShowConfirm(true); }}
      aria-label={`Supprimer l'entraînement : ${workoutTitle}`}
      className="text-xs text-gray-400 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 rounded px-1"
    >
      Supprimer
    </button>
  );
}
