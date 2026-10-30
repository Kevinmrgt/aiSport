import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';
import {
  AdminFilters,
  AdminHeading,
  EmptyState,
  InvalidFilters,
  Pagination,
  readAdminQuery,
  type SearchParams,
  type FilterField,
} from './AdminPrimitives';
import { MemberTable } from './MemberTable';
import { subscriptionLabels } from '@/lib/admin-navigation';
export async function MembersPage({
  searchParams,
  betaOnly = false,
}: {
  searchParams: SearchParams;
  betaOnly?: boolean;
}) {
  const path = betaOnly ? '/admin/beta' : '/admin/membres';
  const parsed = await readAdminQuery(searchParams);
  if (!parsed.success) return <InvalidFilters href={path} />;
  const query = {
    ...parsed.data,
    ...(betaOnly && (!parsed.data.beta || parsed.data.beta === 'none')
      ? { beta: 'present' as const }
      : {}),
  };
  const result = await adminApi.members(query);
  const fields: FilterField[] = [
    {
      name: 'suspended',
      label: 'Compte',
      options: [
        ['', 'Tous les comptes'],
        ['no', 'Actifs'],
        ['yes', 'Suspendus'],
      ],
    },
    {
      name: 'beta',
      label: 'Accès bêta',
      options: [
        ...(betaOnly
          ? [['present', 'Tous les accès'] as [string, string]]
          : [['', 'Tous'] as [string, string], ['none', 'Sans accès'] as [string, string]]),
        ['active', 'Activés'],
        ['inactive', 'Désactivés'],
        ['empty', 'Solde épuisé'],
        ['pending', 'Mot de passe à modifier'],
      ],
    },
    ...(!betaOnly
      ? [
          {
            name: 'subscription' as const,
            label: 'Abonnement',
            options: [
              ['', 'Tous'],
              ['none', 'Sans abonnement'],
              ['attention', 'À vérifier'],
              ...Object.entries(subscriptionLabels),
            ] as Array<[string, string]>,
          },
        ]
      : []),
  ];
  return (
    <>
      <AdminHeading
        eyebrow={betaOnly ? 'Accès bêta' : 'Gestion des comptes'}
        title={betaOnly ? 'Accès bêta' : 'Tous les membres'}
        description={
          betaOnly
            ? 'Créez et gérez les accès de test. Ouvrez une fiche pour modifier le solde ou réinitialiser le mot de passe.'
            : 'Retrouvez un membre et consultez ses accès, son abonnement et son activité.'
        }
      >
        {betaOnly && (
          <Link
            prefetch={false}
            href="/admin/beta/nouveau"
            className="action-primary rounded-full px-5 py-3 text-sm font-bold"
          >
            Créer un accès
          </Link>
        )}
      </AdminHeading>
      <AdminFilters query={query} path={path} fields={fields} />
      {result.items.length ? (
        <MemberTable members={result.items} />
      ) : (
        <EmptyState
          href={path}
          filtered={
            !!query.q ||
            !!query.suspended ||
            !!query.subscription ||
            !!query.userId ||
            query.page > 1 ||
            (!!query.beta && query.beta !== 'present')
          }
          label={betaOnly ? 'Aucun accès bêta' : 'Aucun membre'}
        />
      )}
      <Pagination result={result} query={query} path={path} />
    </>
  );
}
