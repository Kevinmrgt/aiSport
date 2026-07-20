'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './ui/Icon';

interface DeleteConfirmationButtonProps {
  id: string;
  itemLabel: string;
  itemType: "l'entraînement" | 'le programme';
  onDelete: (id: string) => Promise<{ error?: string } | void>;
}

export function DeleteConfirmationButton({
  id,
  itemLabel,
  itemType,
  onDelete,
}: DeleteConfirmationButtonProps) {
  const accessibleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const isPendingRef = useRef(false);
  const shouldRestoreFocusRef = useRef(false);
  const [isPending, setIsPending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  isPendingRef.current = isPending;

  useEffect(() => {
    if (!showConfirm) {
      if (shouldRestoreFocusRef.current) {
        triggerRef.current?.focus();
        shouldRestoreFocusRef.current = false;
      }
      return;
    }

    shouldRestoreFocusRef.current = true;
    confirmRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPendingRef.current) {
        event.preventDefault();
        setShowConfirm(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showConfirm]);

  const handleDelete = async () => {
    setIsPending(true);
    setError(null);
    try {
      const result = await onDelete(id);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setShowConfirm(false);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : `Impossible de supprimer ${itemType} pour le moment.`,
      );
    } finally {
      setIsPending(false);
    }
  };

  if (showConfirm) {
    return (
      <div
        role="group"
        aria-labelledby={`${accessibleId}-title`}
        aria-describedby={`${accessibleId}-description${error ? ` ${accessibleId}-error` : ''}`}
        className="flex w-full max-w-full flex-col items-stretch gap-2 rounded-[1.2rem] border border-sport-orange/30 bg-sport-orange/10 p-3 sm:max-w-sm"
      >
        <p
          id={`${accessibleId}-title`}
          className="min-w-0 break-words text-sm font-black text-sport-orange"
        >
          Confirmer la suppression
        </p>
        <p id={`${accessibleId}-description`} className="min-w-0 break-words text-xs text-zinc-200">
          Supprimer {itemType} &quot;{itemLabel}&quot; ? Cette action est définitive.
        </p>
        {error && (
          <p
            id={`${accessibleId}-error`}
            role="alert"
            className="text-xs font-semibold text-sport-orange"
          >
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            ref={confirmRef}
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
            onClick={() => setShowConfirm(false)}
            disabled={isPending}
            className="rounded-full px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={() => {
        setError(null);
        setShowConfirm(true);
      }}
      aria-label={`Supprimer ${itemType} : ${itemLabel}`}
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold text-zinc-300 transition-colors hover:bg-sport-orange/15 hover:text-sport-orange focus:outline-none focus:ring-2 focus:ring-sport-orange"
    >
      <Icon name="trash" className="h-3.5 w-3.5" />
      Supprimer
    </button>
  );
}
