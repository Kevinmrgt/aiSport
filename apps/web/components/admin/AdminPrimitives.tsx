import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AdminPage, AdminQuery, AdminActivity } from '@alcide/shared';
import { AdminQuerySchema } from '@alcide/shared';
import { Icon, type IconName } from '@/components/ui/Icon';

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export async function readAdminQuery(searchParams: SearchParams) {
  const raw = await searchParams;
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined && first !== '') values[key] = first;
  }
  return AdminQuerySchema.safeParse(values);
}
export function InvalidFilters({ href }: { href: string }) {
  return (
    <div role="alert" className="admin-empty">
      <h2>Filtres invalides</h2>
      <p>Vérifiez les dates, l’identifiant du membre et le numéro de page.</p>
      <Link prefetch={false} href={href}>
        Réinitialiser les filtres
      </Link>
    </div>
  );
}
export function dateLabel(value: string | null, time = false) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    ...(time ? { timeStyle: 'short' as const } : {}),
    timeZone: 'Europe/Paris',
  }).format(new Date(value));
}
export function AdminHeading({
  eyebrow = 'Administration',
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="admin-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function Badge({
  children,
  tone = 'success',
}: {
  children: ReactNode;
  tone?: 'success' | 'warning' | 'danger' | 'neutral';
}) {
  return (
    <span className="admin-badge" data-tone={tone}>
      {children}
    </span>
  );
}
export function Metric({
  label,
  value,
  detail,
  icon,
  href,
}: {
  label: string;
  value: number;
  detail: string;
  icon: IconName;
  href?: string;
}) {
  const content = (
    <>
      <span className="admin-metric-header">
        {label}
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <strong>{value.toLocaleString('fr-FR')}</strong>
      <small>{detail}</small>
    </>
  );
  return href ? (
    <Link prefetch={false} className="admin-metric" href={href}>
      {content}
    </Link>
  ) : (
    <div className="admin-metric">{content}</div>
  );
}
export interface FilterField {
  name: keyof AdminQuery;
  label: string;
  type?: 'date' | 'text';
  options?: Array<[string, string]>;
}
export function AdminFilters({
  query,
  path,
  fields = [],
  searchLabel = 'Recherche',
  searchPlaceholder = 'Nom ou adresse e-mail',
}: {
  query: AdminQuery;
  path: string;
  fields?: FilterField[];
  searchLabel?: string;
  searchPlaceholder?: string;
}) {
  return (
    <form action={path} method="get" className="admin-filters">
      <label>
        {searchLabel}
        <input
          type="search"
          name="q"
          defaultValue={query.q}
          placeholder={searchPlaceholder}
          maxLength={150}
          className="field-control"
        />
      </label>
      {query.userId && <input type="hidden" name="userId" value={query.userId} />}
      {fields.map((field) => (
        <label key={field.name}>
          {field.label}
          {field.options ? (
            <select
              aria-label={field.label}
              name={field.name}
              defaultValue={String(query[field.name] ?? '')}
              className="field-control"
            >
              {field.options.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.type ?? 'text'}
              name={field.name}
              defaultValue={String(query[field.name] ?? '')}
              className="field-control"
            />
          )}
        </label>
      ))}
      <button type="submit">Appliquer</button>
      <Link prefetch={false} href={path}>
        Effacer
      </Link>
    </form>
  );
}
export const dateFields: FilterField[] = [
  { name: 'from', label: 'Du', type: 'date' },
  { name: 'to', label: 'Au', type: 'date' },
];
export function queryHref(path: string, query: Partial<AdminQuery>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value !== undefined && value !== '') params.set(key, String(value));
  return `${path}${params.size ? `?${params}` : ''}`;
}
export function Pagination({
  result,
  query,
  path,
}: {
  result: Pick<AdminPage<unknown>, 'total' | 'page' | 'pageSize'>;
  query: AdminQuery;
  path: string;
}) {
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  return (
    <nav aria-label="Pagination" className="admin-pagination">
      <p>
        {result.total.toLocaleString('fr-FR')} résultat{result.total !== 1 ? 's' : ''} · Page{' '}
        {result.page} sur {pages}
      </p>
      <div>
        {result.page > 1 && (
          <a href={queryHref(path, { ...query, page: Math.min(result.page - 1, pages) })}>
            Précédent
          </a>
        )}
        {result.page < pages && (
          <a href={queryHref(path, { ...query, page: result.page + 1 })}>Suivant</a>
        )}
      </div>
    </nav>
  );
}
export function EmptyState({
  filtered,
  label = 'Aucune donnée pour le moment',
  href,
}: {
  filtered: boolean;
  label?: string;
  href: string;
}) {
  return (
    <div className="admin-empty">
      <Icon name="list" className="h-7 w-7 mx-auto mb-4" />
      <h2>{filtered ? 'Aucun résultat' : label}</h2>
      <p>
        {filtered
          ? 'Aucun élément ne correspond à cette recherche.'
          : 'Les éléments apparaîtront ici au fil de l’activité de la plateforme.'}
      </p>
      {filtered && (
        <Link prefetch={false} href={href}>
          Afficher tous les résultats
        </Link>
      )}
    </div>
  );
}
export function AdminTable({
  caption,
  headers,
  children,
}: {
  caption: string;
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="admin-table-wrap" role="region" aria-label={caption} tabIndex={0}>
      <table className="admin-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {headers.map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function ActivityList({ items }: { items: AdminActivity[] }) {
  return items.length ? (
    <ul className="admin-activity-list">
      {items.map((item) => (
        <li key={item.id}>
          <div>
            <strong>{item.title}</strong>
            <small>
              {item.sport} · {Math.round(item.durationSeconds / 60)} min
            </small>
          </div>
          <small>{dateLabel(item.completedAt, true)}</small>
        </li>
      ))}
    </ul>
  ) : (
    <p className="muted-copy py-5">Aucune séance terminée enregistrée.</p>
  );
}
