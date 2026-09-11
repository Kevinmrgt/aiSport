'use client';

import { useMemo, useState } from 'react';
import type { AdminOverview } from '@/lib/server-api';

type TimeRange = 7 | 30 | 90;
type ActivityMetric = 'sessions' | 'creations' | 'members';
type ChartTooltip = { title: string; detail: string } | null;

const rangeLabels: Record<TimeRange, string> = {
  7: '7 derniers jours',
  30: '30 derniers jours',
  90: '90 derniers jours',
};

const metricLabels: Record<ActivityMetric, string> = {
  sessions: 'Séances terminées',
  creations: 'Contenus générés',
  members: 'Nouveaux membres',
};

function formatDay(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

function plural(value: number, singular: string, pluralLabel = `${singular}s`): string {
  return `${value.toLocaleString('fr-FR')} ${value === 1 ? singular : pluralLabel}`;
}

function valueForMetric(
  entry: AdminOverview['analytics']['daily'][number],
  metric: ActivityMetric,
): number {
  if (metric === 'sessions') return entry.completedSessions;
  if (metric === 'creations') return entry.workouts + entry.programs;
  return entry.newUsers;
}

function totalForMetric(
  entries: AdminOverview['analytics']['daily'],
  metric: ActivityMetric,
): number {
  return entries.reduce((total, entry) => total + valueForMetric(entry, metric), 0);
}

function metricDetail(
  entry: AdminOverview['analytics']['daily'][number],
  metric: ActivityMetric,
): string {
  if (metric === 'sessions') return `${plural(entry.completedSessions, 'séance')} terminée`;
  if (metric === 'members') return `${plural(entry.newUsers, 'nouvelle inscription')}`;
  return `${plural(entry.workouts, 'séance')} générée · ${plural(entry.programs, 'programme')} généré`;
}

function Tooltip({ tooltip }: { tooltip: ChartTooltip }) {
  return (
    <div className="mt-3 min-h-12" aria-live="polite">
      {tooltip && (
        <div
          role="status"
          className="rounded-xl border border-primary-100/20 bg-primary-950/80 px-3 py-2 text-sm shadow-lg"
        >
          <p className="font-bold text-primary-100">{tooltip.title}</p>
          <p className="mt-0.5 text-primary-100/75">{tooltip.detail}</p>
        </div>
      )}
    </div>
  );
}

export function AdminAnalyticsDashboard({ analytics }: Pick<AdminOverview, 'analytics'>) {
  const [timeRange, setTimeRange] = useState<TimeRange>(30);
  const [metric, setMetric] = useState<ActivityMetric>('sessions');
  const [activityTooltip, setActivityTooltip] = useState<ChartTooltip>(null);
  const [membersTooltip, setMembersTooltip] = useState<ChartTooltip>(null);
  const [visitsTooltip, setVisitsTooltip] = useState<ChartTooltip>(null);
  const [sportsTooltip, setSportsTooltip] = useState<ChartTooltip>(null);

  const daily = useMemo(() => analytics.daily.slice(-timeRange), [analytics.daily, timeRange]);
  const metricMax = Math.max(1, ...daily.map((entry) => valueForMetric(entry, metric)));
  const newMembersMax = Math.max(1, ...daily.map((entry) => entry.newUsers));
  const visitsMax = Math.max(1, ...daily.map((entry) => entry.visits));
  const totalMetric = totalForMetric(daily, metric);
  const totalCreations = totalForMetric(daily, 'creations');
  const totalNewMembers = totalForMetric(daily, 'members');
  const totalVisits = daily.reduce((total, entry) => total + entry.visits, 0);

  const memberTrend = daily
    .map((entry, index) => {
      const x = daily.length === 1 ? 50 : (index / (daily.length - 1)) * 100;
      const y = 96 - (entry.newUsers / newMembersMax) * 88;
      return `${x},${y}`;
    })
    .join(' ');

  const sports = useMemo(() => {
    const includedDates = new Set(daily.map((entry) => entry.date));
    const totals = new Map<string, { workouts: number; completedSessions: number }>();
    for (const entry of analytics.sportActivity) {
      if (!includedDates.has(entry.date)) continue;
      const current = totals.get(entry.sport) ?? { workouts: 0, completedSessions: 0 };
      totals.set(entry.sport, {
        workouts: current.workouts + entry.workouts,
        completedSessions: current.completedSessions + entry.completedSessions,
      });
    }
    return [...totals.entries()]
      .map(([sport, totalsBySport]) => ({
        sport,
        ...totalsBySport,
        total: totalsBySport.workouts + totalsBySport.completedSessions,
      }))
      .filter((entry) => entry.total > 0)
      .sort((first, second) => second.total - first.total)
      .slice(0, 5);
  }, [analytics.sportActivity, daily]);

  const sportsMax = Math.max(1, ...sports.map((entry) => entry.total));

  return (
    <section aria-labelledby="admin-analytics-title" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">Pilotage</p>
          <h2 id="admin-analytics-title" className="panel-title mt-1">
            Activité et adoption
          </h2>
          <p className="muted-copy mt-2">
            Survolez ou sélectionnez un point pour afficher son détail précis.
          </p>
        </div>
        <fieldset className="flex flex-wrap gap-3" aria-label="Filtres des graphiques">
          <label className="field-label text-sm">
            Période
            <select
              aria-label="Période des graphiques"
              value={timeRange}
              onChange={(event) => setTimeRange(Number(event.target.value) as TimeRange)}
              className="field-control mt-1 min-w-40"
            >
              {(Object.entries(rangeLabels) as Array<[`${TimeRange}`, string]>).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="field-label text-sm">
            Indicateur
            <select
              aria-label="Indicateur du graphique"
              value={metric}
              onChange={(event) => setMetric(event.target.value as ActivityMetric)}
              className="field-control mt-1 min-w-48"
            >
              {(Object.entries(metricLabels) as Array<[ActivityMetric, string]>).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>
        </fieldset>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-soft p-4">
          <dt className="muted-copy text-xs">{metricLabels[metric]}</dt>
          <dd className="mt-1 text-2xl font-black text-primary-100">
            {totalMetric.toLocaleString('fr-FR')}
          </dd>
          <p className="mt-1 text-xs text-primary-100/75">
            sur {rangeLabels[timeRange].toLowerCase()}
          </p>
        </div>
        <div className="glass-soft p-4">
          <dt className="muted-copy text-xs">Contenus créés</dt>
          <dd className="mt-1 text-2xl font-black text-primary-100">
            {totalCreations.toLocaleString('fr-FR')}
          </dd>
          <p className="mt-1 text-xs text-primary-100/75">séances et programmes</p>
        </div>
        <div className="glass-soft p-4">
          <dt className="muted-copy text-xs">Membres acquis</dt>
          <dd className="mt-1 text-2xl font-black text-primary-100">
            {totalNewMembers.toLocaleString('fr-FR')}
          </dd>
          <p className="mt-1 text-xs text-primary-100/75">nouvelles inscriptions</p>
        </div>
        <div className="glass-soft p-4">
          <dt className="muted-copy text-xs">Visites</dt>
          <dd className="mt-1 text-2xl font-black text-primary-100">
            {totalVisits.toLocaleString('fr-FR')}
          </dd>
          <p className="mt-1 text-xs text-primary-100/75">ouvertures de pages</p>
        </div>
      </dl>

      <div className="grid gap-5 xl:grid-cols-2">
        <article className="glass-panel panel-padding" aria-labelledby="activity-chart-title">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 id="activity-chart-title" className="panel-title text-xl">
                {metricLabels[metric]}
              </h3>
              <p className="muted-copy mt-1 text-sm">Répartition jour par jour</p>
            </div>
            <span className="premium-chip">{rangeLabels[timeRange]}</span>
          </div>
          <div className="mt-6 flex h-56 items-end gap-1.5 border-b border-white/20 pb-6">
            {daily.map((entry, index) => {
              const value = valueForMetric(entry, metric);
              const labelVisible =
                index === 0 ||
                index === daily.length - 1 ||
                index % Math.ceil(daily.length / 4) === 0;
              const tooltip = { title: formatDay(entry.date), detail: metricDetail(entry, metric) };
              return (
                <button
                  key={entry.date}
                  type="button"
                  aria-label={`${tooltip.title} : ${tooltip.detail}`}
                  className="group relative flex h-full min-w-0 flex-1 items-end justify-center border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100"
                  onPointerEnter={() => setActivityTooltip(tooltip)}
                  onPointerLeave={(event) => {
                    if (event.pointerType !== 'touch') setActivityTooltip(null);
                  }}
                  onFocus={() => setActivityTooltip(tooltip)}
                  onBlur={() => setActivityTooltip(null)}
                  onClick={() => setActivityTooltip(tooltip)}
                >
                  <span
                    className="w-full max-w-5 rounded-t-md bg-primary-200/80 transition-colors group-hover:bg-sport-orange group-focus-visible:bg-sport-orange"
                    style={{ height: `${Math.max(3, (value / metricMax) * 100)}%` }}
                  />
                  {labelVisible && (
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-primary-100/65">
                      {formatDay(entry.date)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <Tooltip tooltip={activityTooltip} />
        </article>

        <article className="glass-panel panel-padding" aria-labelledby="members-chart-title">
          <h3 id="members-chart-title" className="panel-title text-xl">
            Acquisition membres
          </h3>
          <p className="muted-copy mt-1 text-sm">Nouvelles inscriptions par jour</p>
          <div className="relative mt-6 h-44">
            <svg
              className="h-full w-full overflow-visible"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <line
                x1="0"
                x2="100"
                y1="96"
                y2="96"
                stroke="currentColor"
                strokeOpacity="0.25"
                vectorEffect="non-scaling-stroke"
              />
              <polyline
                points={memberTrend}
                fill="none"
                stroke="#ffbe9e"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
            {daily.map((entry, index) => {
              const x = daily.length === 1 ? 50 : (index / (daily.length - 1)) * 100;
              const y = 96 - (entry.newUsers / newMembersMax) * 88;
              const tooltip = {
                title: formatDay(entry.date),
                detail: plural(entry.newUsers, 'nouvelle inscription'),
              };
              return (
                <button
                  key={entry.date}
                  type="button"
                  aria-label={`${tooltip.title} : ${tooltip.detail}`}
                  className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary-950 bg-sport-orange shadow-sm transition-transform hover:scale-125 focus-visible:scale-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100"
                  style={{ left: `${x}%`, top: `${y}%` }}
                  onPointerEnter={() => setMembersTooltip(tooltip)}
                  onPointerLeave={(event) => {
                    if (event.pointerType !== 'touch') setMembersTooltip(null);
                  }}
                  onFocus={() => setMembersTooltip(tooltip)}
                  onBlur={() => setMembersTooltip(null)}
                  onClick={() => setMembersTooltip(tooltip)}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-primary-100/65">
            <span>{daily[0] ? formatDay(daily[0].date) : '—'}</span>
            <span>{daily.at(-1) ? formatDay(daily.at(-1)!.date) : '—'}</span>
          </div>
          <Tooltip tooltip={membersTooltip} />
        </article>

        <article className="glass-panel panel-padding" aria-labelledby="visits-chart-title">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 id="visits-chart-title" className="panel-title text-xl">
                Visites de la plateforme
              </h3>
              <p className="muted-copy mt-1 text-sm">
                Ouvertures de pages enregistrées chaque jour
              </p>
            </div>
            <span className="premium-chip">{rangeLabels[timeRange]}</span>
          </div>
          <div className="mt-6 flex h-56 items-end gap-1.5 border-b border-white/20 pb-6">
            {daily.map((entry, index) => {
              const labelVisible =
                index === 0 ||
                index === daily.length - 1 ||
                index % Math.ceil(daily.length / 4) === 0;
              const tooltip = {
                title: formatDay(entry.date),
                detail: plural(entry.visits, 'visite'),
              };
              return (
                <button
                  key={entry.date}
                  type="button"
                  aria-label={`${tooltip.title} : ${tooltip.detail}`}
                  className="group relative flex h-full min-w-0 flex-1 items-end justify-center border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100"
                  onPointerEnter={() => setVisitsTooltip(tooltip)}
                  onPointerLeave={(event) => {
                    if (event.pointerType !== 'touch') setVisitsTooltip(null);
                  }}
                  onFocus={() => setVisitsTooltip(tooltip)}
                  onBlur={() => setVisitsTooltip(null)}
                  onClick={() => setVisitsTooltip(tooltip)}
                >
                  <span
                    className="w-full max-w-5 rounded-t-md bg-sport-orange/75 transition-colors group-hover:bg-sport-orange group-focus-visible:bg-sport-orange"
                    style={{ height: `${Math.max(3, (entry.visits / visitsMax) * 100)}%` }}
                  />
                  {labelVisible && (
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-primary-100/65">
                      {formatDay(entry.date)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <Tooltip tooltip={visitsTooltip} />
          <p className="muted-copy text-xs">
            Mesure agrégée, sans identifiant ni adresse de page. Le comptage débute avec cette
            version.
          </p>
        </article>
      </div>

      <article className="glass-panel panel-padding" aria-labelledby="sports-chart-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="sports-chart-title" className="panel-title text-xl">
              Sports les plus actifs
            </h3>
            <p className="muted-copy mt-1 text-sm">
              Séances finalisées et contenus générés dans la période sélectionnée.
            </p>
          </div>
          <span className="text-sm text-primary-100/75">
            {sports.length} sport{sports.length === 1 ? '' : 's'} actif
            {sports.length === 1 ? '' : 's'}
          </span>
        </div>
        {sports.length === 0 ? (
          <p className="muted-copy mt-5">Aucune activité sportive sur cette période.</p>
        ) : (
          <>
            <ol className="mt-5 space-y-4">
              {sports.map((entry) => {
                const tooltip = {
                  title: entry.sport.charAt(0).toUpperCase() + entry.sport.slice(1),
                  detail: `${plural(entry.completedSessions, 'séance')} terminée · ${plural(entry.workouts, 'contenu')} généré`,
                };
                return (
                  <li key={entry.sport}>
                    <button
                      type="button"
                      className="w-full rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-100"
                      aria-label={`${tooltip.title} : ${tooltip.detail}`}
                      onPointerEnter={() => setSportsTooltip(tooltip)}
                      onPointerLeave={(event) => {
                        if (event.pointerType !== 'touch') setSportsTooltip(null);
                      }}
                      onFocus={() => setSportsTooltip(tooltip)}
                      onBlur={() => setSportsTooltip(null)}
                      onClick={() => setSportsTooltip(tooltip)}
                    >
                      <span className="mb-1 flex items-center justify-between gap-4 text-sm">
                        <span className="font-bold capitalize">{entry.sport}</span>
                        <span className="text-primary-100/75">
                          {entry.completedSessions} séance{entry.completedSessions === 1 ? '' : 's'}{' '}
                          · {entry.workouts} contenu{entry.workouts === 1 ? '' : 's'}
                        </span>
                      </span>
                      <span className="block h-2 overflow-hidden rounded-full bg-white/10">
                        <span
                          className="block h-full rounded-full bg-primary-200 transition-colors hover:bg-sport-orange"
                          style={{ width: `${(entry.total / sportsMax) * 100}%` }}
                        />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <Tooltip tooltip={sportsTooltip} />
          </>
        )}
      </article>
    </section>
  );
}
