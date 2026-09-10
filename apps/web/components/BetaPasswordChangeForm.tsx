'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';

function formText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

export function BetaPasswordChangeForm({ changePassword }: { changePassword: (input: { currentPassword: string; newPassword: string }) => Promise<{ error?: string }> }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return <form className="mt-6 space-y-5" action={(formData) => startTransition(() => void (async () => {
    const currentPassword = formText(formData, 'currentPassword');
    const newPassword = formText(formData, 'newPassword');
    const confirmation = formText(formData, 'confirmation');
    if (newPassword.length < 12) return setError('Le nouveau mot de passe doit contenir au moins 12 caractères.');
    if (newPassword !== confirmation) return setError('Les deux nouveaux mots de passe ne correspondent pas.');
    const result = await changePassword({ currentPassword, newPassword });
    setError(result.error ?? null);
  })())}>
    <label className="field-label">Mot de passe temporaire<input name="currentPassword" type="password" autoComplete="current-password" required className="field-control mt-2" /></label>
    <label className="field-label">Nouveau mot de passe<input name="newPassword" type="password" autoComplete="new-password" minLength={12} required className="field-control mt-2" /></label>
    <label className="field-label">Confirmer le nouveau mot de passe<input name="confirmation" type="password" autoComplete="new-password" minLength={12} required className="field-control mt-2" /></label>
    {error && <p role="alert" className="text-sm text-sport-orange">{error}</p>}
    <Button type="submit" isLoading={pending}>Enregistrer le mot de passe</Button>
  </form>;
}
