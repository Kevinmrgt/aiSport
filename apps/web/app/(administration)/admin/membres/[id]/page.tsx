import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { adminApi } from '@/lib/admin-api';
import { isServerApiNotFound } from '@/lib/server-api';
import {
  AdminHeading,
  Badge,
  Metric,
  ActivityList,
  dateLabel,
} from '@/components/admin/AdminPrimitives';
import { AdminActionForm, ReasonField } from '@/components/admin/AdminActionForm';
import { subscriptionLabels } from '@/lib/admin-navigation';

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const detail = await adminApi.member(id).catch((error: unknown) => {
    if (isServerApiNotFound(error)) notFound();
    throw error;
  });
  const m = detail.member;
  return (
    <>
      <AdminHeading eyebrow="Fiche membre" title={m.name ?? m.email} description={m.email}>
        <Badge tone={m.suspendedAt ? 'danger' : 'success'}>
          {m.suspendedAt ? 'Compte suspendu' : 'Compte actif'}
        </Badge>
      </AdminHeading>
      <div className="admin-metric-grid">
        <Metric
          label="Crédits d’accueil"
          value={m.credits.welcome}
          detail="Solde standard disponible"
          icon="user"
        />
        <Metric
          label="Crédits Premium"
          value={m.credits.premium}
          detail="Solde d’abonnement disponible"
          icon="zap"
        />
        <Metric
          label="Crédits offerts"
          value={m.credits.offered}
          detail="Sans expiration"
          icon="spark"
        />
        <Metric
          label="Générations bêta"
          value={m.beta?.remaining ?? 0}
          detail={m.beta ? 'Solde distinct du compte standard' : 'Aucun accès bêta'}
          icon="activity"
        />
      </div>
      <section className="admin-panel mt-6">
        <div className="admin-section-head">
          <h2>Informations du compte</h2>
          <Link
            prefetch={false}
            href={'/admin/journal?userId=' + id}
            className="text-primary-200 underline underline-offset-4 text-xs"
          >
            Voir le journal du membre
          </Link>
        </div>
        <dl className="admin-description-list">
          <div>
            <dt>Inscription</dt>
            <dd>{dateLabel(m.createdAt)}</dd>
          </div>
          <div>
            <dt>Dernière activité sportive enregistrée</dt>
            <dd>{dateLabel(m.lastActivityAt, true)}</dd>
          </div>
          <div>
            <dt>Abonnement</dt>
            <dd>
              {m.subscription
                ? (subscriptionLabels[m.subscription.status] ?? m.subscription.status)
                : 'Sans abonnement'}
              {m.subscription && (
                <span className="muted-copy">
                  {' '}
                  · Échéance {dateLabel(m.subscription.periodEnd)}
                  {m.subscription.cancelAtPeriodEnd ? ' · Résiliation programmée' : ''}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt>Accès</dt>
            <dd>
              {m.isAdmin ? 'Administrateur' : 'Membre'}
              {m.suspendedAt ? ' · Suspendu depuis le ' + dateLabel(m.suspendedAt) : ''}
            </dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-4 text-xs text-primary-200">
          <Link prefetch={false} href={'/admin/abonnements?userId=' + id}>
            Voir les abonnements
          </Link>
          <Link prefetch={false} href={'/admin/credits?userId=' + id}>
            Historique des dotations
          </Link>
          {m.stripeCustomerId && (
            <a
              href={
                'https://dashboard.stripe.com/test/customers/' +
                encodeURIComponent(m.stripeCustomerId)
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              Ouvrir Stripe (test) ↗
            </a>
          )}
        </div>
      </section>
      <div className="admin-two-columns mt-6">
        <section className="admin-panel">
          <h2 className="mb-4">Offrir des crédits standard</h2>
          <p className="muted-copy text-xs mb-5">
            Ces crédits s’ajoutent au solde standard et n’expirent pas. Ils sont distincts des
            générations bêta.
          </p>
          <AdminActionForm
            operation="credits.grant"
            hidden={{ userId: id }}
            label="Attribuer les crédits"
            successMessage="Les crédits offerts ont été attribués et enregistrés dans le journal."
          >
            <label>
              Nombre de crédits
              <input
                className="field-control"
                type="number"
                name="amount"
                min={1}
                max={10000}
                required
                defaultValue={5}
              />
            </label>
            <ReasonField />
          </AdminActionForm>
        </section>
        <section className="admin-panel">
          <h2 className="mb-4">{m.suspendedAt ? 'Réactiver le compte' : 'Suspendre le compte'}</h2>
          {m.isAdmin ? (
            <p className="muted-copy">
              Les comptes administrateurs sont protégés contre la suspension.
            </p>
          ) : (
            <>
              <p className="muted-copy text-xs mb-5">
                La suspension bloque l’accès sportif. Le membre garde accès à la gestion de son
                abonnement.
              </p>
              <AdminActionForm
                operation="member.suspension"
                hidden={{ userId: id, suspended: String(!m.suspendedAt) }}
                label={m.suspendedAt ? 'Réactiver le membre' : 'Suspendre le membre'}
                danger={!m.suspendedAt}
                confirm={
                  m.suspendedAt
                    ? undefined
                    : 'Suspendre le compte de ' + m.email + ' ? Son accès sportif sera bloqué.'
                }
                successMessage="Le statut du compte a été mis à jour."
              >
                <ReasonField />
              </AdminActionForm>
            </>
          )}
        </section>
      </div>
      <section className="admin-panel mt-6">
        <div className="admin-section-head">
          <h2>Accès bêta</h2>
          {m.beta && (
            <Badge tone={m.beta.active ? 'success' : 'neutral'}>
              {m.beta.active ? 'Activé' : 'Désactivé'}
            </Badge>
          )}
        </div>
        {!m.beta ? (
          <p className="muted-copy">
            Ce membre ne dispose pas d’un accès bêta.{' '}
            <Link
              prefetch={false}
              href={
                '/admin/beta/nouveau?email=' +
                encodeURIComponent(m.email) +
                '&name=' +
                encodeURIComponent(m.name ?? '')
              }
              className="text-primary-200 underline"
            >
              Créer un accès
            </Link>
          </p>
        ) : (
          <div className="grid gap-4">
            {m.beta.mustChangePassword && (
              <p className="admin-notice">Le membre doit modifier son mot de passe temporaire.</p>
            )}
            <details className="glass-soft p-4">
              <summary className="cursor-pointer font-bold">Ajuster les générations bêta</summary>
              <div className="mt-4">
                <AdminActionForm
                  operation="beta.credits"
                  hidden={{ userId: id }}
                  label="Enregistrer l’ajustement"
                  successMessage="Le solde bêta a été mis à jour."
                >
                  <label>
                    Variation de générations
                    <input
                      className="field-control"
                      type="number"
                      name="amount"
                      min={-10000}
                      max={10000}
                      required
                      defaultValue={5}
                    />
                    <span className="muted-copy text-xs">
                      Montant positif pour ajouter, négatif pour retirer.
                    </span>
                  </label>
                  <ReasonField />
                </AdminActionForm>
              </div>
            </details>
            <details className="glass-soft p-4">
              <summary className="cursor-pointer font-bold">
                {m.beta.active ? 'Désactiver' : 'Réactiver'} l’accès bêta
              </summary>
              <div className="mt-4">
                <AdminActionForm
                  operation="beta.status"
                  hidden={{ userId: id, active: String(!m.beta.active) }}
                  label={m.beta.active ? 'Désactiver l’accès' : 'Réactiver l’accès'}
                  danger={m.beta.active}
                  successMessage="L’accès bêta a été mis à jour. Les anciennes sessions bêta ont été révoquées."
                >
                  <ReasonField />
                </AdminActionForm>
              </div>
            </details>
            <details className="glass-soft p-4">
              <summary className="cursor-pointer font-bold">Réinitialiser le mot de passe</summary>
              <div className="mt-4">
                <AdminActionForm
                  operation="beta.reset"
                  hidden={{ userId: id }}
                  label="Réinitialiser le mot de passe"
                  confirm="Réinitialiser ce mot de passe et déconnecter les sessions bêta en cours ?"
                  successMessage="Le mot de passe a été réinitialisé et les anciennes sessions révoquées."
                >
                  <ReasonField />
                </AdminActionForm>
              </div>
            </details>
            <details className="glass-soft p-4">
              <summary className="cursor-pointer font-bold text-orange-200">
                Retirer l’accès bêta
              </summary>
              <p className="muted-copy my-4 text-xs">
                Le compte, ses données sportives et son historique administratif sont conservés.
              </p>
              <AdminActionForm
                operation="beta.delete"
                hidden={{ userId: id }}
                label="Retirer l’accès bêta"
                danger
                confirm="Retirer cet accès bêta ? Les données sportives et le compte seront conservés."
                successMessage="L’accès bêta a été retiré. Les données du membre sont conservées."
              >
                <ReasonField />
              </AdminActionForm>
            </details>
          </div>
        )}
      </section>
      <section className="admin-panel mt-6">
        <div className="admin-section-head">
          <h2>Activité sportive</h2>
          <div className="flex gap-4 text-xs text-primary-200">
            <Link prefetch={false} href={'/admin/seances?userId=' + id}>
              {m.workoutCount} séances
            </Link>
            <Link prefetch={false} href={'/admin/programmes?userId=' + id}>
              {m.programCount} programmes
            </Link>
          </div>
        </div>
        <p className="muted-copy mb-3">
          {m.completedCount} séances terminées · 10 dernières activités
        </p>
        <ActivityList items={detail.recentActivity} />
      </section>
    </>
  );
}
