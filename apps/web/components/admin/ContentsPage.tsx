import Link from 'next/link';
import { adminApi } from '@/lib/admin-api';
import {
  AdminHeading,
  AdminFilters,
  AdminTable,
  EmptyState,
  InvalidFilters,
  Pagination,
  readAdminQuery,
  dateFields,
  dateLabel,
  type SearchParams,
} from './AdminPrimitives';
export const levels: Record<string, string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};
export async function ContentsPage({
  searchParams,
  kind,
}: {
  searchParams: SearchParams;
  kind: 'workouts' | 'programs';
}) {
  const isWorkout = kind === 'workouts',
    path = isWorkout ? '/admin/seances' : '/admin/programmes',
    parsed = await readAdminQuery(searchParams);
  if (!parsed.success) return <InvalidFilters href={path} />;
  const query = parsed.data,
    result = await adminApi.contents(kind, query);
  return (
    <>
      <AdminHeading
        eyebrow="Contenus sportifs"
        title={isWorkout ? 'Séances' : 'Programmes'}
        description="Recherchez un contenu généré et consultez son détail ainsi que son utilisation."
      />
      <AdminFilters
        path={path}
        query={query}
        searchPlaceholder="Titre, nom ou e-mail du membre"
        fields={[
          { name: 'sport', label: 'Sport' },
          {
            name: 'level',
            label: 'Niveau',
            options: [['', 'Tous les niveaux'], ...Object.entries(levels)],
          },
          ...dateFields,
        ]}
      />
      {result.items.length ? (
        <AdminTable
          caption={isWorkout ? 'Séances enregistrées' : 'Programmes enregistrés'}
          headers={['Contenu', 'Membre', 'Sport et niveau', 'Durée', 'Utilisation', 'Création']}
        >
          {result.items.map((c) => (
            <tr key={c.id}>
              <td>
                <Link prefetch={false} href={path + '/' + c.id}>
                  {c.title}
                </Link>
                {c.weeksCount && <small>{c.weeksCount} semaines</small>}
              </td>
              <td>
                <Link prefetch={false} href={'/admin/membres/' + c.userId}>
                  {c.name ?? c.email}
                </Link>
                <small>{c.email}</small>
              </td>
              <td>
                {c.sport}
                <small>{levels[c.difficulty] ?? c.difficulty}</small>
              </td>
              <td>
                {c.durationMinutes} min{!isWorkout && <small>Par séance</small>}
              </td>
              <td>
                {c.completedCount}
                <small>Séances terminées</small>
              </td>
              <td>{dateLabel(c.createdAt)}</td>
            </tr>
          ))}
        </AdminTable>
      ) : (
        <EmptyState
          href={path}
          filtered={Object.keys(query).length > 1 || query.page > 1}
          label={isWorkout ? 'Aucune séance enregistrée' : 'Aucun programme enregistré'}
        />
      )}
      <Pagination path={path} query={query} result={result} />
    </>
  );
}
