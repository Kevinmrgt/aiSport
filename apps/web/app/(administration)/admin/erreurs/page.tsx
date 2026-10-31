import Link from 'next/link';
import { AdminIncidentQuerySchema } from '@alcide/shared';
import { adminApi } from '@/lib/admin-api';
import {
  incidentSeverityLabels,
  incidentSourceLabels,
  incidentStatusLabels,
  incidentSummary,
} from '@/lib/incident-labels';
import { AdminActionForm } from '@/components/admin/AdminActionForm';
import {
  AdminHeading,
  AdminTable,
  Badge,
  EmptyState,
  Pagination,
  dateLabel,
  type SearchParams,
} from '@/components/admin/AdminPrimitives';

const path = '/admin/erreurs';
export default async function IncidentsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const entries = Object.entries(raw).filter(([, value]) => value !== undefined && value !== '');
  const parsed = AdminIncidentQuerySchema.safeParse(Object.fromEntries(entries));
  if (
    !parsed.success ||
    entries.some(([, value]) => Array.isArray(value)) ||
    entries.some(
      ([key]) => !['page', 'q', 'from', 'to', 'source', 'severity', 'status'].includes(key),
    )
  ) {
    return (
      <div role="alert" className="admin-empty">
        <h1>Filtres invalides</h1>
        <p>Vérifiez les dates, l’origine, la gravité, le statut et le numéro de page.</p>
        <Link prefetch={false} href={path}>
          Réinitialiser les filtres
        </Link>
      </div>
    );
  }
  const query = parsed.data;
  const result = await adminApi.incidents(query);
  const filtered = Object.entries(query).some(([key, value]) =>
    key === 'page' ? Number(value) > 1 : !!value,
  );
  return (
    <>
      <AdminHeading
        eyebrow="Journal"
        title="Erreurs et incidents"
        description="Les incidents similaires sont regroupés pour suivre leur fréquence et leur traitement."
      />
      <p className="admin-notice mb-5">
        Collecte depuis la mise en service de ce journal ; l’historique antérieur et la couverture
        complète ne sont pas garantis. Les incidents navigateur concernent les sessions connectées
        autorisées. Aucun message d’erreur, pile technique, contenu de génération ou identifiant de
        membre n’est conservé ici.
      </p>
      <form action={path} method="get" className="admin-filters">
        <label>
          Code, route ou identifiant de requête
          <input
            type="search"
            name="q"
            maxLength={150}
            defaultValue={query.q}
            className="field-control"
          />
        </label>
        {(
          [
            { name: 'source', label: 'Origine', labels: incidentSourceLabels },
            { name: 'severity', label: 'Gravité', labels: incidentSeverityLabels },
            { name: 'status', label: 'Statut', labels: incidentStatusLabels },
          ] as const
        ).map(({ name, label, labels }) => (
          <label key={name}>
            {label}
            <select
              name={name}
              aria-label={label}
              defaultValue={query[name] ?? ''}
              className="field-control"
            >
              <option value="">Tous</option>
              {Object.entries(labels).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label>
          Du
          <input type="date" name="from" defaultValue={query.from} className="field-control" />
        </label>
        <label>
          Au
          <input type="date" name="to" defaultValue={query.to} className="field-control" />
        </label>
        <button type="submit">Appliquer</button>
        <Link prefetch={false} href={path}>
          Effacer
        </Link>
      </form>
      {result.items.length ? (
        <AdminTable
          caption="Incidents regroupés"
          headers={[
            'Incident',
            'Origine et gravité',
            'Occurrences',
            'Première et dernière détection',
            'Détail technique',
            'Traitement',
          ]}
        >
          {result.items.map((incident) => (
            <tr key={incident.id}>
              <td>
                <strong>{incidentSummary(incident)}</strong>
                <small className="mt-2 block break-words">{incident.code}</small>
              </td>
              <td>
                <span className="mb-2 block">{incidentSourceLabels[incident.source]}</span>
                <Badge tone={incident.severity === 'warning' ? 'warning' : 'danger'}>
                  {incidentSeverityLabels[incident.severity]}
                </Badge>
              </td>
              <td>{incident.occurrenceCount.toLocaleString('fr-FR')}</td>
              <td>
                <span className="block">Première : {dateLabel(incident.firstSeenAt, true)}</span>
                <span className="mt-2 block">
                  Dernière : {dateLabel(incident.lastSeenAt, true)}
                </span>
              </td>
              <td>
                <dl className="grid gap-2 break-words">
                  <div>
                    <dt>Route</dt>
                    <dd>
                      <code>{incident.route}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>Action</dt>
                    <dd>{incident.method}</dd>
                  </div>
                  <div>
                    <dt>Statut HTTP</dt>
                    <dd>{incident.statusCode ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Dernière requête</dt>
                    <dd>
                      <code>{incident.lastRequestId ?? '—'}</code>
                    </dd>
                  </div>
                </dl>
              </td>
              <td>
                <Badge tone={incident.status === 'resolved' ? 'success' : 'neutral'}>
                  {incidentStatusLabels[incident.status]}
                </Badge>
                <div className="mt-3">
                  <AdminActionForm
                    operation="incident.status"
                    hidden={{ incidentId: incident.id }}
                    label="Enregistrer le statut"
                    successMessage="Statut de l’incident enregistré."
                  >
                    <label>
                      Statut de l’incident {incident.code}
                      <select
                        name="status"
                        aria-label={`Statut de l’incident ${incident.code}`}
                        defaultValue={incident.status}
                        className="field-control"
                      >
                        {Object.entries(incidentStatusLabels).map(([value, text]) => (
                          <option key={value} value={value}>
                            {text}
                          </option>
                        ))}
                      </select>
                    </label>
                  </AdminActionForm>
                </div>
              </td>
            </tr>
          ))}
        </AdminTable>
      ) : (
        <EmptyState href={path} filtered={filtered} label="Aucun incident enregistré" />
      )}
      <Pagination path={path} query={query} result={result} />
    </>
  );
}
