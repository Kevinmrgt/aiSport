'use client';

import { useState, type FormEvent } from 'react';
import { Button } from './ui/Button';
import { clearTimerProgress } from '@/lib/timer-storage';

export function AccountControls({
  deleteAction,
}: {
  deleteAction: (confirmation: string) => Promise<{ error?: string } | void>;
}) {
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const response = await fetch('/api/account/export', { cache: 'no-store' });
      if (!response.ok) throw new Error('Export unavailable');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'alcide-donnees.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError('Export indisponible. Réessayez ou contactez le responsable.');
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || exporting || confirmation !== 'SUPPRIMER') return;
    setPending(true);
    setError(null);
    clearTimerProgress();
    try {
      const result = await deleteAction(confirmation);
      if (result?.error) setError(result.error);
    } catch {
      setError('La suppression ne peut pas être confirmée. Réessayez ou contactez le responsable.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className="space-y-5 rounded-2xl border border-white/15 bg-zinc-950/50 p-5"
      aria-labelledby="account-data-title"
    >
      <h2 id="account-data-title" className="text-2xl font-black text-white">
        Mes données et mon compte
      </h2>
      <p className="muted-copy">
        Téléchargez vos données avant de fermer le compte si vous souhaitez les conserver.
      </p>
      <Button
        type="button"
        onClick={() => {
          void handleExport();
        }}
        disabled={exporting || pending}
      >
        {exporting ? 'Export en cours…' : 'Télécharger mes données'}
      </Button>
      <p
        role={exportError ? 'alert' : 'status'}
        aria-live="polite"
        className="text-sm text-zinc-100"
      >
        {exportError ?? ''}
      </p>
      <form
        onSubmit={(event) => {
          void handleDelete(event);
        }}
        className="space-y-3"
        aria-describedby="delete-account-description delete-account-status"
      >
        <p id="delete-account-description" className="text-sm text-zinc-200">
          La suppression efface définitivement votre profil, vos séances, programmes, journaux et
          notes. Elle termine les anciennes sessions Alcide. Votre compte Google est conservé.
          Patientez une minute avant une nouvelle connexion ; elle créera un compte vide.
        </p>
        <label htmlFor="delete-account-confirmation" className="block font-bold text-white">
          Saisissez SUPPRIMER pour confirmer
        </label>
        <input
          id="delete-account-confirmation"
          name="confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          className="min-h-11 w-full rounded-xl bg-zinc-900 p-3 text-white"
          required
          disabled={pending}
        />
        <p
          id="delete-account-status"
          role={error ? 'alert' : 'status'}
          aria-live="polite"
          className="text-sm text-zinc-100"
        >
          {error ?? (pending ? 'Suppression en cours…' : '')}
        </p>
        <Button type="submit" disabled={pending || exporting || confirmation !== 'SUPPRIMER'}>
          Supprimer définitivement mon compte
        </Button>
      </form>
    </section>
  );
}
