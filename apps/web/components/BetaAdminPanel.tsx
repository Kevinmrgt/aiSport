'use client';

import { useState, useTransition } from 'react';
import type { AdminOverview, BetaTesterSummary } from '@/lib/server-api';
import { Button } from '@/components/ui/Button';

type Result<T> = { data?: T; error?: string };

function formText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

interface BetaAdminPanelProps {
  initialBetaTesters: BetaTesterSummary[];
  overview: AdminOverview;
  createBetaTester: (input: { name: string; email: string; generationBalance: number }) => Promise<Result<BetaTesterSummary & { temporaryPassword: string }>>;
  adjustCredits: (userId: string, amount: number) => Promise<Result<{ generationBalance: number }>>;
  setStatus: (userId: string, active: boolean) => Promise<Result<{ ok: boolean }>>;
  resetPassword: (userId: string) => Promise<Result<{ temporaryPassword: string }>>;
  deleteBetaTester: (userId: string) => Promise<Result<{ ok: boolean }>>;
  savePlatformSettings: (input: AdminOverview['settings']) => Promise<Result<{ settings: AdminOverview['settings'] }>>;
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div className="metric-card p-5"><dt className="muted-copy text-sm">{label}</dt><dd className="mt-2 text-3xl font-black text-primary-100">{value.toLocaleString('fr-FR')}</dd><p className="mt-2 text-xs text-primary-100/80">{detail}</p></div>;
}

export function BetaAdminPanel({ initialBetaTesters, overview, createBetaTester, adjustCredits, setStatus, resetPassword, deleteBetaTester, savePlatformSettings }: BetaAdminPanelProps) {
  const [testers, setTesters] = useState(initialBetaTesters);
  const [settings, setSettings] = useState(overview.settings);
  const [notice, setNotice] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<void>) {
    setNotice(null);
    startTransition(() => void action());
  }

  const activeTesters = testers.filter((tester) => tester.active).length;
  const pendingPasswordChanges = testers.filter((tester) => tester.mustChangePassword).length;
  const availableGenerations = testers.reduce((total, tester) => total + tester.generationBalance, 0);
  const totalUsers = Math.max(0, overview.stats.totalUsers - initialBetaTesters.length + testers.length);

  return (
    <div className="space-y-7">
      <section aria-labelledby="admin-stats-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">Vue d’ensemble</p><h2 id="admin-stats-title" className="panel-title mt-1">Activité de la plateforme</h2></div><p className="muted-copy text-sm">Données actualisées au chargement de cette page.</p></div>
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Membres" value={totalUsers} detail={`${overview.stats.newUsersLast30Days} nouveau${overview.stats.newUsersLast30Days === 1 ? '' : 'x'} ces 30 derniers jours`} />
          <Metric label="Accès bêta actifs" value={activeTesters} detail={`${testers.length} compte${testers.length === 1 ? '' : 's'} bêta au total`} />
          <Metric label="Générations disponibles" value={availableGenerations} detail={`${pendingPasswordChanges} mot de passe à modifier`} />
          <Metric label="Séances terminées" value={overview.stats.completedSessionCount} detail={`${overview.stats.workoutCount} séances et ${overview.stats.programCount} programmes enregistrés`} />
        </dl>
      </section>

      <section className="glass-panel panel-padding" aria-labelledby="platform-settings-title">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="section-kicker">Configuration</p><h2 id="platform-settings-title" className="panel-title mt-1">Réglages de la plateforme</h2><p className="muted-copy mt-2 max-w-2xl">Le modèle par défaut s’applique aux générations des membres qui n’ont pas choisi de préférence personnelle.</p></div><span className="premium-chip">IA OpenAI</span></div>
        <form className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end" onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          run(async () => {
            const nextSettings = {
              defaultAiModel: formText(formData, 'defaultAiModel'),
              defaultBetaGenerationBalance: Number(formData.get('defaultBetaGenerationBalance') ?? 0),
            };
            const result = await savePlatformSettings(nextSettings);
            if (result.error || !result.data) return setNotice(result.error ?? 'Sauvegarde impossible.');
            setSettings(result.data.settings);
            setNotice('Les réglages de la plateforme ont été enregistrés.');
          });
        }}>
          <label className="field-label">Modèle IA par défaut<select name="defaultAiModel" value={settings.defaultAiModel} onChange={(event) => setSettings((current) => ({ ...current, defaultAiModel: event.target.value }))} className="field-control mt-2">{overview.availableModels.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}</select></label>
          <label className="field-label">Générations à l’ouverture d’un compte bêta<input name="defaultBetaGenerationBalance" type="number" min="1" max="10000" value={settings.defaultBetaGenerationBalance} onChange={(event) => setSettings((current) => ({ ...current, defaultBetaGenerationBalance: Number(event.target.value) || 1 }))} required className="field-control mt-2" /></label>
          <Button type="submit" isLoading={isPending}>Enregistrer</Button>
        </form>
      </section>

      <section className="glass-panel panel-padding">
        <h2 className="panel-title">Créer un bêta-testeur</h2>
        <form
          key={settings.defaultBetaGenerationBalance}
          className="mt-5 grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            run(async () => {
              const result = await createBetaTester({
                name: formText(formData, 'name'),
                email: formText(formData, 'email'),
                generationBalance: Number(formData.get('generationBalance') ?? 0),
              });
              if (result.error || !result.data) return setNotice(result.error ?? 'Création impossible.');
              setTesters((current) => [result.data!, ...current]);
              setTemporaryPassword(result.data.temporaryPassword);
              setNotice(`Le compte ${result.data.email} a été créé.`);
            });
          }}
        >
          <label className="field-label">Nom<input name="name" required maxLength={128} className="field-control mt-2" /></label>
          <label className="field-label">Adresse e-mail<input name="email" type="email" required maxLength={254} className="field-control mt-2" /></label>
          <label className="field-label">Générations disponibles<input name="generationBalance" type="number" min="0" max="10000" defaultValue={settings.defaultBetaGenerationBalance} required className="field-control mt-2" /></label>
          <div className="flex items-end"><Button type="submit" isLoading={isPending}>Créer le compte</Button></div>
        </form>
      </section>

      {temporaryPassword && (
        <section className="rounded-[1.25rem] border border-primary-300/40 bg-primary-300/10 p-5" role="status">
          <h2 className="font-bold">Code temporaire à 6 chiffres</h2>
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
                <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  const submitter = (event.nativeEvent as SubmitEvent).submitter;
                  const direction = submitter instanceof HTMLButtonElement ? submitter.value : '';
                  run(async () => {
                    const entered = Number(formText(formData, 'amount'));
                    const amount = direction === 'remove' ? -entered : entered;
                    if (!Number.isInteger(amount) || amount === 0) return setNotice('Saisissez un nombre entier de générations.');
                    const result = await adjustCredits(tester.userId, amount);
                    if (result.error || !result.data) return setNotice(result.error ?? 'Ajustement impossible.');
                    setTesters((current) => current.map((item) => item.userId === tester.userId ? { ...item, generationBalance: result.data!.generationBalance } : item));
                  });
                }}>
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
                <Button size="sm" variant="danger" disabled={isPending} onClick={() => {
                  if (!window.confirm(`Supprimer l’accès bêta de ${tester.email} ? Les données d’entraînement sont conservées.`)) return;
                  run(async () => {
                    const result = await deleteBetaTester(tester.userId);
                    if (result.error || !result.data) return setNotice(result.error ?? 'Suppression impossible.');
                    setTesters((current) => current.filter((item) => item.userId !== tester.userId));
                    setNotice(`L’accès bêta de ${tester.email} a été supprimé.`);
                  });
                }}>Supprimer</Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
