'use client';

import { useState } from 'react';

interface DeleteProgramButtonProps {
  programId: string;
  programTitle: string;
  onDelete: (id: string) => Promise<void>;
}

// RGAA 4.1: bouton de suppression accessible avec confirmation explicite
export function DeleteProgramButton({ programId, programTitle, onDelete }: DeleteProgramButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsPending(true);
    try {
      await onDelete(programId);
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
        aria-labelledby="confirm-program-title"
        className="flex w-full max-w-full flex-col items-stretch gap-2 rounded-lg border border-red-400/30 bg-red-500/10 p-2 sm:max-w-sm sm:flex-row sm:items-center"
      >
        <span id="confirm-program-title" className="min-w-0 flex-1 break-words text-xs text-red-100">
          Supprimer &laquo;{programTitle}&raquo; ?
        </span>
        <button
          type="button"
          onClick={() => { void handleDelete(); }}
          disabled={isPending}
          aria-busy={isPending}
          className="rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white hover:bg-red-400 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          {isPending ? 'Suppression…' : 'Confirmer'}
        </button>
        <button
          type="button"
          onClick={() => { setShowConfirm(false); }}
          disabled={isPending}
          aria-label="Annuler la suppression"
          className="rounded-full px-2 py-1 text-xs text-zinc-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-300"
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
      aria-label={`Supprimer le programme : ${programTitle}`}
      className="rounded-full px-2 py-1 text-xs font-semibold text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-400"
    >
      Supprimer
    </button>
  );
}
