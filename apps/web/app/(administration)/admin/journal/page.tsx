import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';
import { adminActionLabels } from '@/lib/admin-navigation';
import {
  AdminHeading,
  AdminFilters,
  AdminTable,
  EmptyState,
  InvalidFilters,
  Pagination,
  readAdminQuery,
  dateLabel,
  dateFields,
  type SearchParams,
} from '@/components/admin/AdminPrimitives';
function Changes({ value }: { value: Record<string, unknown> }) {
  const labels: Record<string, string> = {
    before: 'Avant',
    after: 'Après',
    amount: 'Quantité',
    balanceAfter: 'Solde après action',
    defaultAiModel: 'Modèle par défaut',
    defaultBetaGenerationBalance: 'Dotation bêta initiale',
    mustChangePassword: 'Mot de passe à modifier',
    sessionsRevoked: 'Sessions révoquées',
    accessRemoved: 'Accès retiré',
    trainingDataPreserved: 'Données sportives conservées',
  };
  return (
    <dl className="space-y-1">
      {Object.entries(value).map(([key, v]) => (
        <div key={key}>
          <dt className="inline text-primary-100/60">{labels[key] ?? key} : </dt>
          <dd className="inline">
            {typeof v === 'object' && v !== null ? (
              <Changes value={v as Record<string, unknown>} />
            ) : typeof v === 'boolean' ? (
              v ? (
                'Oui'
              ) : (
                'Non'
              )
            ) : typeof v === 'string' || typeof v === 'number' ? (
              v
            ) : (
              '—'
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  const path = '/admin/journal',
    parsed = await readAdminQuery(searchParams);
  if (!parsed.success) return <InvalidFilters href={path} />;
  const query = parsed.data,
    result = await adminApi.audit(query);
  return (
    <>
      <AdminHeading
        eyebrow="Traçabilité"
        title="Actions administratives"
        description="Chaque modification indique son auteur, sa cible et son motif."
      />
      <p className="admin-notice mb-5">
        Journal complet depuis le {dateLabel(result.trackingSince, true)}. Les ajustements bêta
        historiques disponibles ont été repris.
      </p>
      <AdminFilters
        path={path}
        query={query}
        searchPlaceholder="E-mail du membre ou motif"
        fields={[
          { name: 'actor', label: 'Administrateur' },
          {
            name: 'action',
            label: 'Action',
            options: [['', 'Toutes les actions'], ...Object.entries(adminActionLabels)],
          },
          ...dateFields,
        ]}
      />
      {result.items.length ? (
        <AdminTable
          caption="Journal des actions"
          headers={['Date', 'Administrateur', 'Action', 'Cible', 'Motif', 'Changements']}
        >
          {result.items.map((e) => (
            <tr key={e.id}>
              <td>{dateLabel(e.createdAt, true)}</td>
              <td>{e.actorEmail}</td>
              <td>{adminActionLabels[e.action] ?? e.action}</td>
              <td>
                {e.userId ? (
                  <Link prefetch={false} href={'/admin/membres/' + e.userId}>
                    {e.targetEmail ?? 'Membre'}
                  </Link>
                ) : (
                  (e.targetEmail ?? 'Plateforme')
                )}
              </td>
              <td className="max-w-64 break-words">{e.reason}</td>
              <td>
                <details>
                  <summary className="cursor-pointer">Voir le détail</summary>
                  <div className="mt-3 min-w-48">
                    <Changes value={e.changes} />
                  </div>
                </details>
              </td>
            </tr>
          ))}
        </AdminTable>
      ) : (
        <EmptyState
          href={path}
          filtered={Object.keys(query).length > 1 || query.page > 1}
          label="Aucune action enregistrée"
        />
      )}
      <Pagination path={path} query={query} result={result} />
    </>
  );
}
