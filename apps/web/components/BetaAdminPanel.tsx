'use client';

import { useState, useTransition } from 'react';
import type { AdminOverview, BetaTesterSummary } from '@/lib/server-api';
import { AdminAnalyticsDashboard } from '@/components/AdminAnalyticsDashboard';
import { Button } from '@/components/ui/Button';

type Result<T> = { data?: T; error?: string };
type AdminSection = 'overview' | 'beta' | 'models' | 'platform';

const adminSections: Array<{ id: AdminSection; label: string; description: string }> = [
  { id: 'overview', label: 'Vue d’ensemble', description: 'Indicateurs et tendances' },
  { id: 'beta', label: 'Accès bêta', description: 'Comptes et crédits' },
  { id: 'models', label: 'Modèles IA', description: 'Choix du modèle par défaut' },
  { id: 'platform', label: 'Plateforme', description: 'Règles et valeurs par défaut' },
];

function formText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="metric-card p-4">
      <dt className="muted-copy text-sm">{label}</dt>
      <dd className="mt-1 text-2xl font-black text-primary-100">{value.toLocaleString('fr-FR')}</dd>
      <p className="mt-1 text-xs text-primary-100/80">{detail}</p>
    </div>
  );
}

interface BetaAdminPanelProps {
  initialBetaTesters: BetaTesterSummary[];
  overview: AdminOverview;
  createBetaTester: (input: {
    name: string;
    email: string;
    generationBalance: number;
  }) => Promise<Result<BetaTesterSummary & { temporaryPassword: string }>>;
  adjustCredits: (userId: string, amount: number) => Promise<Result<{ generationBalance: number }>>;
  setStatus: (userId: string, active: boolean) => Promise<Result<{ ok: boolean }>>;
  resetPassword: (userId: string) => Promise<Result<{ temporaryPassword: string }>>;
  deleteBetaTester: (userId: string) => Promise<Result<{ ok: boolean }>>;
  savePlatformSettings: (
    input: AdminOverview['settings'],
  ) => Promise<Result<{ settings: AdminOverview['settings'] }>>;
}

export function BetaAdminPanel({
  initialBetaTesters,
  overview,
  createBetaTester,
  adjustCredits,
  setStatus,
  resetPassword,
  deleteBetaTester,
  savePlatformSettings,
}: BetaAdminPanelProps) {
  const [section, setSection] = useState<AdminSection>('overview');
  const [testers, setTesters] = useState(initialBetaTesters);
  const [settings, setSettings] = useState(overview.settings);
  const [notice, setNotice] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<void>) {
    setNotice(null);
    startTransition(() => void action());
  }

  function persistSettings(nextSettings: AdminOverview['settings'], successMessage: string) {
    run(async () => {
      const result = await savePlatformSettings(nextSettings);
      if (result.error || !result.data) return setNotice(result.error ?? 'Sauvegarde impossible.');
      setSettings(result.data.settings);
      setNotice(successMessage);
    });
  }

  const activeTesters = testers.filter((tester) => tester.active).length;
  const pendingPasswordChanges = testers.filter((tester) => tester.mustChangePassword).length;
  const availableGenerations = testers.reduce(
    (total, tester) => total + tester.generationBalance,
    0,
  );
  const totalUsers = Math.max(
    0,
    overview.stats.totalUsers - initialBetaTesters.length + testers.length,
  );

  return (
    <div className="space-y-5">
      <nav className="glass-panel overflow-x-auto p-2" aria-label="Sous-menus administration">
        <div className="flex min-w-max gap-1" role="tablist" aria-label="Sections d'administration">
          {adminSections.map((item) => {
            const isActive = section === item.id;
            return (
              <button
                key={item.id}
                id={`admin-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`admin-panel-${item.id}`}
                onClick={() => setSection(item.id)}
                className={`rounded-2xl px-3 py-2.5 text-left transition-colors ${isActive ? 'bg-primary-200 text-ink shadow-lg' : 'text-primary-100 hover:bg-white/10'}`}
              >
                <span className="block text-sm font-black">{item.label}</span>
                <span
                  className={`mt-0.5 block text-xs ${isActive ? 'text-ink/75' : 'text-primary-100/65'}`}
                >
                  {item.description}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {notice && (
        <p
          role="status"
          className="rounded-xl border border-primary-300/35 bg-primary-300/10 px-3 py-2 text-sm text-primary-100"
        >
          {notice}
        </p>
      )}

      {section === 'overview' && (
        <section
          id="admin-panel-overview"
          role="tabpanel"
          aria-labelledby="admin-tab-overview"
          className="space-y-5"
        >
          <section aria-labelledby="admin-stats-title">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="section-kicker">Vue d’ensemble</p>
                <h2 id="admin-stats-title" className="panel-title mt-1">
                  Santé de la plateforme
                </h2>
              </div>
              <p className="muted-copy text-sm">
                Les indicateurs généraux sont mis à jour au chargement.
              </p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Membres"
                value={totalUsers}
                detail={`${overview.stats.newUsersLast30Days} nouveau${overview.stats.newUsersLast30Days === 1 ? '' : 'x'} ces 30 derniers jours`}
              />
              <Metric
                label="Accès bêta actifs"
                value={activeTesters}
                detail={`${testers.length} compte${testers.length === 1 ? '' : 's'} bêta au total`}
              />
              <Metric
                label="Générations disponibles"
                value={availableGenerations}
                detail={`${pendingPasswordChanges} mot de passe à modifier`}
              />
              <Metric
                label="Séances terminées"
                value={overview.stats.completedSessionCount}
                detail={`${overview.stats.workoutCount} séances et ${overview.stats.programCount} programmes enregistrés`}
              />
            </dl>
          </section>
          <AdminAnalyticsDashboard analytics={overview.analytics} />
        </section>
      )}

      {section === 'beta' && (
        <section
          id="admin-panel-beta"
          role="tabpanel"
          aria-labelledby="admin-tab-beta"
          className="space-y-5"
        >
          <section className="glass-panel panel-padding" aria-labelledby="create-beta-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="section-kicker">Accès</p>
                <h2 id="create-beta-title" className="panel-title mt-1">
                  Créer un bêta-testeur
                </h2>
                <p className="muted-copy mt-2 text-sm">
                  La dotation proposée respecte actuellement la règle de la plateforme.
                </p>
              </div>
              <span className="premium-chip">
                {settings.defaultBetaGenerationBalance} générations par défaut
              </span>
            </div>
            <form
              key={settings.defaultBetaGenerationBalance}
              className="mt-4 grid gap-3 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                run(async () => {
                  const result = await createBetaTester({
                    name: formText(formData, 'name'),
                    email: formText(formData, 'email'),
                    generationBalance: Number(formData.get('generationBalance') ?? 0),
                  });
                  if (result.error || !result.data)
                    return setNotice(result.error ?? 'Création impossible.');
                  setTesters((current) => [result.data!, ...current]);
                  setTemporaryPassword(result.data.temporaryPassword);
                  setNotice(`Le compte ${result.data.email} a été créé.`);
                });
              }}
            >
              <label className="field-label">
                Nom
                <input name="name" required maxLength={128} className="field-control mt-2" />
              </label>
              <label className="field-label">
                Adresse e-mail
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  className="field-control mt-2"
                />
              </label>
              <label className="field-label">
                Générations disponibles
                <input
                  name="generationBalance"
                  type="number"
                  min="0"
                  max="10000"
                  defaultValue={settings.defaultBetaGenerationBalance}
                  required
                  className="field-control mt-2"
                />
              </label>
              <div className="flex items-end">
                <Button type="submit" isLoading={isPending}>
                  Créer le compte
                </Button>
              </div>
            </form>
          </section>

          {temporaryPassword && (
            <section
              className="rounded-[1.25rem] border border-primary-300/40 bg-primary-300/10 p-4"
              role="status"
            >
              <h2 className="font-bold">Code temporaire à 6 chiffres</h2>
              <p className="mt-2 text-sm">
                Copiez-le maintenant et transmettez-le au testeur. Il devra se reconnecter avec ce
                mot de passe avant de le modifier. Il ne sera plus affiché.
              </p>
              <code className="mt-3 block break-all rounded-lg bg-black/30 p-3 text-base text-white">
                {temporaryPassword}
              </code>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => setTemporaryPassword(null)}
              >
                J’ai bien copié
              </Button>
            </section>
          )}

          <section className="glass-panel panel-padding" aria-labelledby="beta-list-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="section-kicker">Comptes</p>
                <h2 id="beta-list-title" className="panel-title mt-1">
                  Bêta-testeurs
                </h2>
              </div>
              <span className="text-sm text-primary-100/75">
                {activeTesters} actif{activeTesters === 1 ? '' : 's'} · {availableGenerations}{' '}
                générations
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {testers.length === 0 ? (
                <p className="muted-copy">Aucun compte bêta pour le moment.</p>
              ) : (
                testers.map((tester) => (
                  <article key={tester.userId} className="rounded-2xl border border-white/10 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold">{tester.name ?? tester.email}</h3>
                        <p className="muted-copy text-sm">{tester.email}</p>
                      </div>
                      <span className={tester.active ? 'text-primary-200' : 'text-sport-orange'}>
                        {tester.active ? 'Actif' : 'Désactivé'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">
                      <strong>{tester.generationBalance}</strong> génération
                      {tester.generationBalance === 1 ? '' : 's'} disponible
                      {tester.generationBalance === 1 ? '' : 's'}
                      {tester.mustChangePassword ? ' · mot de passe à changer' : ''}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <form
                        className="flex flex-wrap items-end gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const formData = new FormData(event.currentTarget);
                          const submitter = (event.nativeEvent as SubmitEvent).submitter;
                          const direction =
                            submitter instanceof HTMLButtonElement ? submitter.value : '';
                          run(async () => {
                            const entered = Number(formText(formData, 'amount'));
                            const amount = direction === 'remove' ? -entered : entered;
                            if (!Number.isInteger(amount) || amount === 0)
                              return setNotice('Saisissez un nombre entier de générations.');
                            const result = await adjustCredits(tester.userId, amount);
                            if (result.error || !result.data)
                              return setNotice(result.error ?? 'Ajustement impossible.');
                            setTesters((current) =>
                              current.map((item) =>
                                item.userId === tester.userId
                                  ? { ...item, generationBalance: result.data!.generationBalance }
                                  : item,
                              ),
                            );
                          });
                        }}
                      >
                        <label className="field-label text-xs">
                          Nombre
                          <input
                            name="amount"
                            type="number"
                            min="1"
                            max="10000"
                            defaultValue="1"
                            required
                            className="field-control mt-1 w-24"
                          />
                        </label>
                        <Button
                          size="sm"
                          variant="secondary"
                          name="direction"
                          value="add"
                          disabled={isPending}
                        >
                          Ajouter
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          name="direction"
                          value="remove"
                          disabled={isPending}
                        >
                          Retirer
                        </Button>
                      </form>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isPending}
                        onClick={() =>
                          run(async () => {
                            const result = await resetPassword(tester.userId);
                            if (result.error || !result.data)
                              return setNotice(result.error ?? 'Réinitialisation impossible.');
                            setTemporaryPassword(result.data.temporaryPassword);
                            setTesters((current) =>
                              current.map((item) =>
                                item.userId === tester.userId
                                  ? { ...item, mustChangePassword: true }
                                  : item,
                              ),
                            );
                            setNotice(
                              'Mot de passe réinitialisé. La session en cours du testeur a été déconnectée.',
                            );
                          })
                        }
                      >
                        Réinitialiser le mot de passe
                      </Button>
                      <Button
                        size="sm"
                        variant={tester.active ? 'danger' : 'primary'}
                        disabled={isPending}
                        onClick={() =>
                          run(async () => {
                            const result = await setStatus(tester.userId, !tester.active);
                            if (result.error) return setNotice(result.error);
                            setTesters((current) =>
                              current.map((item) =>
                                item.userId === tester.userId
                                  ? { ...item, active: !item.active }
                                  : item,
                              ),
                            );
                          })
                        }
                      >
                        {tester.active ? 'Désactiver' : 'Réactiver'}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={isPending}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `Supprimer l’accès bêta de ${tester.email} ? Les données d’entraînement sont conservées.`,
                            )
                          )
                            return;
                          run(async () => {
                            const result = await deleteBetaTester(tester.userId);
                            if (result.error || !result.data)
                              return setNotice(result.error ?? 'Suppression impossible.');
                            setTesters((current) =>
                              current.filter((item) => item.userId !== tester.userId),
                            );
                            setNotice(`L’accès bêta de ${tester.email} a été supprimé.`);
                          });
                        }}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      )}

      {section === 'models' && (
        <section
          id="admin-panel-models"
          role="tabpanel"
          aria-labelledby="admin-tab-models"
          className="space-y-5"
        >
          <section className="glass-panel panel-padding" aria-labelledby="models-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="section-kicker">Intelligence artificielle</p>
                <h2 id="models-title" className="panel-title mt-1">
                  Modèles disponibles
                </h2>
                <p className="muted-copy mt-2 max-w-2xl">
                  Sélectionnez le modèle appliqué par défaut aux membres qui n’ont pas défini leur
                  propre préférence.
                </p>
              </div>
              <span className="premium-chip">
                Modèle actif :{' '}
                {overview.availableModels.find((model) => model.id === settings.defaultAiModel)
                  ?.label ?? settings.defaultAiModel}
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {overview.availableModels.map((model) => (
                <article
                  key={model.id}
                  className={`rounded-2xl border p-3 ${settings.defaultAiModel === model.id ? 'border-primary-200 bg-primary-200/15' : 'border-white/10 bg-black/10'}`}
                >
                  <p className="text-sm font-black">{model.label}</p>
                  <p className="muted-copy mt-2 text-xs">
                    {settings.defaultAiModel === model.id
                      ? 'Modèle par défaut actuel'
                      : 'Disponible pour la plateforme'}
                  </p>
                </article>
              ))}
            </div>
            <form
              className="mt-4 flex flex-wrap items-end gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                persistSettings(
                  {
                    ...settings,
                    defaultAiModel: formText(new FormData(event.currentTarget), 'defaultAiModel'),
                  },
                  'Le modèle IA par défaut a été enregistré.',
                );
              }}
            >
              <label className="field-label min-w-64">
                Modèle IA par défaut
                <select
                  name="defaultAiModel"
                  value={settings.defaultAiModel}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, defaultAiModel: event.target.value }))
                  }
                  className="field-control mt-2"
                >
                  {overview.availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" isLoading={isPending}>
                Utiliser ce modèle
              </Button>
            </form>
          </section>
        </section>
      )}

      {section === 'platform' && (
        <section
          id="admin-panel-platform"
          role="tabpanel"
          aria-labelledby="admin-tab-platform"
          className="space-y-5"
        >
          <section className="glass-panel panel-padding" aria-labelledby="platform-settings-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="section-kicker">Configuration</p>
                <h2 id="platform-settings-title" className="panel-title mt-1">
                  Règles de la plateforme
                </h2>
                <p className="muted-copy mt-2 max-w-2xl">
                  Définissez les valeurs initiales appliquées lors de la création d’un accès bêta.
                </p>
              </div>
              <span className="premium-chip">Gestion des accès</span>
            </div>
            <form
              className="mt-4 flex flex-wrap items-end gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                persistSettings(
                  {
                    ...settings,
                    defaultBetaGenerationBalance: Number(
                      new FormData(event.currentTarget).get('defaultBetaGenerationBalance') ?? 0,
                    ),
                  },
                  'La dotation bêta par défaut a été enregistrée.',
                );
              }}
            >
              <label className="field-label min-w-72">
                Générations à l’ouverture d’un compte bêta
                <input
                  name="defaultBetaGenerationBalance"
                  type="number"
                  min="1"
                  max="10000"
                  value={settings.defaultBetaGenerationBalance}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      defaultBetaGenerationBalance: Number(event.target.value) || 1,
                    }))
                  }
                  required
                  className="field-control mt-2"
                />
              </label>
              <Button type="submit" isLoading={isPending}>
                Enregistrer la règle
              </Button>
            </form>
          </section>
          <section
            className="grid gap-3 sm:grid-cols-2"
            aria-label="Récapitulatif de configuration"
          >
            <article className="glass-soft p-4">
              <p className="muted-copy text-sm">Modèle par défaut</p>
              <p className="mt-2 font-black">
                {overview.availableModels.find((model) => model.id === settings.defaultAiModel)
                  ?.label ?? settings.defaultAiModel}
              </p>
            </article>
            <article className="glass-soft p-4">
              <p className="muted-copy text-sm">Dotation bêta initiale</p>
              <p className="mt-2 font-black">
                {settings.defaultBetaGenerationBalance.toLocaleString('fr-FR')} générations
              </p>
            </article>
          </section>
        </section>
      )}
    </div>
  );
}
