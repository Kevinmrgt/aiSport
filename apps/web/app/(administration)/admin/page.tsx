import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';
import { AdminHeading, Badge, Metric } from '@/components/admin/AdminPrimitives';
import { Icon } from '@/components/ui/Icon';
export default async function AdminPage() {
  const s = await adminApi.summary();
  return (
    <>
      <AdminHeading
        eyebrow="Pilotage de la plateforme"
        title="Vue d’ensemble"
        description="L’activité d’Alcide et les comptes à accompagner, réunis au même endroit."
      >
        <Link
          prefetch={false}
          href="/admin/beta/nouveau"
          className="action-primary inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold"
        >
          <Icon name="plus" className="h-4 w-4" />
          Créer un accès bêta
        </Link>
      </AdminHeading>
      <div className="admin-metric-grid">
        <Metric
          label="Membres"
          value={s.totalUsers}
          detail={s.newUsersLast30Days + ' nouveaux ces 30 derniers jours'}
          icon="user"
          href="/admin/membres"
        />
        <Metric
          label="Accès bêta actifs"
          value={s.activeBetaTesterCount}
          detail="Accès actuellement activés"
          icon="spark"
          href="/admin/beta?beta=active"
        />
        <Metric
          label="Abonnements actifs"
          value={s.activeSubscriptions}
          detail="Facturation en mode test"
          icon="zap"
          href="/admin/abonnements?subscription=active"
        />
        <Metric
          label="Séances terminées"
          value={s.completedSessionCount}
          detail="Activités enregistrées par les membres"
          icon="check"
          href="/admin/statistiques"
        />
      </div>
      <div className="admin-two-columns mt-7">
        <section className="admin-panel">
          <div className="admin-section-head">
            <h2>À suivre</h2>
            <Badge tone={s.exhaustedBetaCount + s.attentionSubscriptions ? 'warning' : 'neutral'}>
              {s.exhaustedBetaCount + s.attentionSubscriptions} à vérifier
            </Badge>
          </div>
          <Link prefetch={false} href="/admin/beta?beta=empty" className="admin-attention">
            <span>
              <Icon name="zap" />
            </span>
            <div>
              <strong>{s.exhaustedBetaCount} accès bêta sans génération</strong>
              <small>Consulter les soldes et ajuster une dotation.</small>
            </div>
            <Icon name="arrow-right" />
          </Link>
          <Link
            prefetch={false}
            href="/admin/abonnements?subscription=attention"
            className="admin-attention"
          >
            <span>
              <Icon name="clock" />
            </span>
            <div>
              <strong>{s.attentionSubscriptions} abonnement(s) à vérifier</strong>
              <small>Paiement en retard, impayé ou abonnement à finaliser.</small>
            </div>
            <Icon name="arrow-right" />
          </Link>
          <Link prefetch={false} href="/admin/journal" className="admin-attention">
            <span>
              <Icon name="list" />
            </span>
            <div>
              <strong>Dernières actions administratives</strong>
              <small>Retrouver une modification et son motif.</small>
            </div>
            <Icon name="arrow-right" />
          </Link>
        </section>
        <section className="admin-panel">
          <div className="admin-section-head">
            <h2>Contenus sportifs</h2>
            <Icon name="activity" />
          </div>
          <p className="muted-copy mb-5">Les entraînements enregistrés sur la plateforme.</p>
          <div className="grid grid-cols-2 gap-4">
            <Metric
              label="Séances"
              value={s.workoutCount}
              detail="Ouvrir les séances"
              icon="barbell"
              href="/admin/seances"
            />
            <Metric
              label="Programmes"
              value={s.programCount}
              detail="Ouvrir les programmes"
              icon="layers"
              href="/admin/programmes"
            />
          </div>
          <Link
            prefetch={false}
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary-200"
            href="/admin/statistiques"
          >
            Explorer les statistiques
            <Icon name="arrow-right" className="h-4 w-4" />
          </Link>
        </section>
      </div>
      <div className="admin-panel mt-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2>Un espace pour chaque action</h2>
          <p className="muted-copy mt-2">
            Ouvrez une fiche membre pour gérer ses accès, ses crédits et consulter son activité.
          </p>
        </div>
        <Link
          prefetch={false}
          href="/admin/membres"
          className="action-secondary rounded-full px-5 py-3 font-bold text-sm"
        >
          Voir les membres
        </Link>
      </div>
    </>
  );
}
