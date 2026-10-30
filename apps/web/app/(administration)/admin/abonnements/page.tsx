import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';
import { subscriptionLabels } from '@/lib/admin-navigation';
import {
  AdminHeading,
  AdminFilters,
  AdminTable,
  Badge,
  EmptyState,
  InvalidFilters,
  Pagination,
  readAdminQuery,
  dateLabel,
  dateFields,
  type SearchParams,
} from '@/components/admin/AdminPrimitives';
export default async function SubscriptionsPage({ searchParams }: { searchParams: SearchParams }) {
  const path = '/admin/abonnements';
  const parsed = await readAdminQuery(searchParams);
  if (!parsed.success) return <InvalidFilters href={path} />;
  const query = parsed.data,
    result = await adminApi.subscriptions(query);
  return (
    <>
      <AdminHeading
        eyebrow="Abonnements et crédits"
        title="Abonnements"
        description="Consultez les états enregistrés, les prochaines échéances et les résiliations programmées."
      >
        <Badge tone="warning">Stripe · Mode test</Badge>
      </AdminHeading>
      <AdminFilters
        path={path}
        query={query}
        fields={[
          {
            name: 'subscription',
            label: 'Statut',
            options: [
              ['', 'Tous les statuts'],
              ['attention', 'À vérifier'],
              ...Object.entries(subscriptionLabels),
            ],
          },
          ...dateFields,
        ]}
      />
      {result.items.length ? (
        <AdminTable
          caption="Abonnements de test"
          headers={['Membre', 'Statut', 'Échéance', 'Résiliation', 'Mise à jour', 'Stripe']}
        >
          {result.items.map((s) => (
            <tr key={s.id}>
              <td>
                <Link prefetch={false} href={'/admin/membres/' + s.userId}>
                  {s.name ?? s.email}
                </Link>
                <small>{s.email}</small>
              </td>
              <td>
                <Badge
                  tone={
                    ['past_due', 'unpaid', 'incomplete'].includes(s.status) ? 'warning' : 'neutral'
                  }
                >
                  {subscriptionLabels[s.status] ?? s.status}
                </Badge>
              </td>
              <td>{dateLabel(s.periodEnd)}</td>
              <td>{s.cancelAtPeriodEnd ? 'Programmée à l’échéance' : 'Non programmée'}</td>
              <td>{dateLabel(s.updatedAt, true)}</td>
              <td>
                <a
                  href={
                    'https://dashboard.stripe.com/test/subscriptions/' + encodeURIComponent(s.id)
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ouvrir ↗
                </a>
              </td>
            </tr>
          ))}
        </AdminTable>
      ) : (
        <EmptyState
          href={path}
          filtered={Object.keys(query).length > 1 || query.page > 1}
          label="Aucun abonnement enregistré"
        />
      )}
      <Pagination path={path} query={query} result={result} />
      <p className="muted-copy text-xs">
        Les dates filtrent les échéances. Les états sont ceux de la dernière synchronisation Stripe
        affichée dans le tableau.
      </p>
    </>
  );
}
