'use client';

import { useState, useTransition } from 'react';
import type { BetaTesterSummary } from '@/lib/server-api';
import { Button } from '@/components/ui/Button';

type Result<T> = { data?: T; error?: string };

function formText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

interface BetaAdminPanelProps {
  initialBetaTesters: BetaTesterSummary[];
  createBetaTester: (input: { name: string; email: string; generationBalance: number }) => Promise<Result<BetaTesterSummary & { temporaryPassword: string }>>;
  adjustCredits: (userId: string, amount: number) => Promise<Result<{ generationBalance: number }>>;
  setStatus: (userId: string, active: boolean) => Promise<Result<{ ok: boolean }>>;
  resetPassword: (userId: string) => Promise<Result<{ temporaryPassword: string }>>;
}

export function BetaAdminPanel({ initialBetaTesters, createBetaTester, adjustCredits, setStatus, resetPassword }: BetaAdminPanelProps) {
  const [testers, setTesters] = useState(initialBetaTesters);
  const [notice, setNotice] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<void>) {
    setNotice(null);
    startTransition(() => void action());
  }

  return (
    <div className="space-y-7">
      <section className="glass-panel panel-padding">
        <h2 className="panel-title">Créer un bêta-testeur</h2>
        <form
          className="mt-5 grid gap-4 md:grid-cols-2"
          action={(formData) => run(async () => {
            const result = await createBetaTester({
              name: formText(formData, 'name'),
              email: formText(formData, 'email'),
              generationBalance: Number(formData.get('generationBalance') ?? 0),
            });
            if (result.error || !result.data) return setNotice(result.error ?? 'Création impossible.');
            setTesters((current) => [result.data!, ...current]);
            setTemporaryPassword(result.data.temporaryPassword);
            setNotice(`Le compte ${result.data.email} a été créé.`);
          })}
        >
          <label className="field-label">Nom<input name="name" required maxLength={128} className="field-control mt-2" /></label>
          <label className="field-label">Adresse e-mail<input name="email" type="email" required maxLength={254} className="field-control mt-2" /></label>
          <label className="field-label">Générations disponibles<input name="generationBalance" type="number" min="0" max="10000" defaultValue="10" required className="field-control mt-2" /></label>
          <div className="flex items-end"><Button type="submit" isLoading={isPending}>Créer le compte</Button></div>
        </form>
      </section>

      {temporaryPassword && (
        <section className="rounded-[1.25rem] border border-primary-300/40 bg-primary-300/10 p-5" role="status">
          <h2 className="font-bold">Mot de passe temporaire</h2>
          <p className="mt-2 text-sm">Copiez-le maintenant et transmettez-le au testeur. Il devra se reconnecter avec ce mot de passe avant de le modifier. Il ne sera plus affiché.</p>
          <code className="mt-3 block break-all rounded-lg bg-black/30 p-3 text-base text-white">{temporaryPassword}</code>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => setTemporaryPassword(null)}>J’ai bien copié</Button>
        </section>
      )}

      {notice && <p role="status" className="text-sm text-primary-100">{notice}</p>}

      <section className="glass-panel panel-padding">
        <h2 className="panel-title">Bêta-testeurs</h2>
        <div className="mt-5 space-y-4">
          {testers.length === 0 ? <p className="muted-copy">Aucun compte bêta pour le moment.</p> : testers.map((tester) => (
            <article key={tester.userId} className="rounded-2xl border border-white/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{tester.name ?? tester.email}</h3>
                  <p className="muted-copy text-sm">{tester.email}</p>
                </div>
                <span className={tester.active ? 'text-primary-200' : 'text-sport-orange'}>{tester.active ? 'Actif' : 'Désactivé'}</span>
              </div>
              <p className="mt-3 text-sm"><strong>{tester.generationBalance}</strong> génération{tester.generationBalance === 1 ? '' : 's'} disponible{tester.generationBalance === 1 ? '' : 's'}{tester.mustChangePassword ? ' · mot de passe à changer' : ''}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <form className="flex flex-wrap items-end gap-2" action={(formData) => run(async () => {
                  const entered = Number(formText(formData, 'amount'));
                  const direction = formText(formData, 'direction');
                  const amount = direction === 'remove' ? -entered : entered;
                  if (!Number.isInteger(amount) || amount === 0) return setNotice('Saisissez un nombre entier de générations.');
                  const result = await adjustCredits(tester.userId, amount);
                  if (result.error || !result.data) return setNotice(result.error ?? 'Ajustement impossible.');
                  setTesters((current) => current.map((item) => item.userId === tester.userId ? { ...item, generationBalance: result.data!.generationBalance } : item));
                })}>
                  <label className="field-label text-xs">Nombre<input name="amount" type="number" min="1" max="10000" defaultValue="1" required className="field-control mt-1 w-24" /></label>
                  <Button size="sm" variant="secondary" name="direction" value="add" disabled={isPending}>Ajouter</Button>
                  <Button size="sm" variant="secondary" name="direction" value="remove" disabled={isPending}>Retirer</Button>
                </form>
                <Button size="sm" variant="secondary" disabled={isPending} onClick={() => run(async () => {
                  const result = await resetPassword(tester.userId);
                  if (result.error || !result.data) return setNotice(result.error ?? 'Réinitialisation impossible.');
                  setTemporaryPassword(result.data.temporaryPassword);
                  setTesters((current) => current.map((item) => item.userId === tester.userId ? { ...item, mustChangePassword: true } : item));
                  setNotice('Mot de passe réinitialisé. La session en cours du testeur a été déconnectée.');
                })}>Réinitialiser le mot de passe</Button>
                <Button size="sm" variant={tester.active ? 'danger' : 'primary'} disabled={isPending} onClick={() => run(async () => {
                  const result = await setStatus(tester.userId, !tester.active);
                  if (result.error) return setNotice(result.error);
                  setTesters((current) => current.map((item) => item.userId === tester.userId ? { ...item, active: !item.active } : item));
                })}>{tester.active ? 'Désactiver' : 'Réactiver'}</Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
