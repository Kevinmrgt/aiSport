import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';
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
const labels = {
  welcome: 'Accueil',
  premium: 'Premium',
  offered: 'Offerts',
  beta: 'Générations bêta',
};
export default async function CreditsPage({ searchParams }: { searchParams: SearchParams }) {
  const path = '/admin/credits',
    parsed = await readAdminQuery(searchParams);
  if (!parsed.success) return <InvalidFilters href={path} />;
  const query = parsed.data,
    result = await adminApi.credits(query);
  return (
    <>
      <AdminHeading
        eyebrow="Abonnements et crédits"
        title="Dotations et ajustements"
        description="Retrouvez les crédits attribués et les ajustements bêta. Ouvrez une fiche membre pour offrir des crédits."
      />
      <AdminFilters
        path={path}
        query={query}
        searchPlaceholder="Adresse e-mail"
        fields={dateFields}
      />
      {result.items.length ? (
        <AdminTable
          caption="Historique des dotations"
          headers={[
            'Membre',
            'Nature',
            'Montant',
            'Solde de la dotation',
            'Date',
            'Expiration',
            'Motif',
          ]}
        >
          {result.items.map((e) => (
            <tr key={e.id}>
              <td>
                {e.userId ? (
                  <Link prefetch={false} href={'/admin/membres/' + e.userId}>
                    {e.email}
                  </Link>
                ) : (
                  e.email
                )}
              </td>
              <td>
                <Badge tone={e.kind === 'beta' ? 'warning' : 'neutral'}>{labels[e.kind]}</Badge>
              </td>
              <td>
                {e.amount > 0 ? '+' : ''}
                {e.amount}
              </td>
              <td>
                {e.kind === 'beta' ? (
                  <>
                    {e.balanceAfter}
                    <small>Solde bêta après action</small>
                  </>
                ) : (
                  e.remaining
                )}
              </td>
              <td>{dateLabel(e.createdAt, true)}</td>
              <td>
                {e.kind === 'beta' ? '—' : e.expiresAt ? dateLabel(e.expiresAt) : 'Sans expiration'}
              </td>
              <td className="max-w-64 break-words">{e.reason ?? 'Dotation automatique'}</td>
            </tr>
          ))}
        </AdminTable>
      ) : (
        <EmptyState
          href={path}
          filtered={Object.keys(query).length > 1 || query.page > 1}
          label="Aucune dotation enregistrée"
        />
      )}
      <Pagination path={path} query={query} result={result} />
      <p className="muted-copy text-xs">
        Un solde de dotation expirée n’est plus utilisable. Les ajustements bêta affichent le solde
        au moment de l’action.
      </p>
    </>
  );
}
