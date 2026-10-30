import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import { getTopSports } from '@/lib/sport-stats';
import { EmptyState, GlassPanel } from '@/components/PremiumPrimitives';

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours} h ${remainingMinutes}` : `${hours} h`;
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const [stats, sessionStats] = await Promise.all([
    serverApi.getStats(),
    serverApi.getSessionLogStats(),
  ]);

  const topLevel = (() => {
    const top = Object.entries(stats.byLevel).sort(([, a], [, b]) => b - a)[0];
    return top ? (LEVEL_LABELS[top[0]] ?? top[0]) : '--';
  })();

  const topSports = getTopSports(stats.bySport);

  return (
    <section aria-labelledby="dashboard-title" className="space-y-7">
      <header className="page-heading">
        <h1 id="dashboard-title" className="page-title">
          Ma progression
        </h1>
        <Link href="/generate" className="action-primary">
          Nouvelle séance
        </Link>
      </header>
      {stats.total === 0 && sessionStats.totalCompleted === 0 ? (
        <EmptyState
          title="Aucune activité"
          description="Créez une première séance pour commencer votre suivi."
          href="/generate"
          cta="Créer une séance"
        />
      ) : (
        <>
          <GlassPanel>
            <dl className="stats-overview">
              <div>
                <dt>Séances créées</dt>
                <dd>{stats.total}</dd>
              </div>
              <div>
                <dt>Séances terminées</dt>
                <dd>{sessionStats.totalCompleted}</dd>
              </div>
              <div>
                <dt>Temps réalisé</dt>
                <dd>{formatDuration(sessionStats.totalDurationSeconds)}</dd>
              </div>
              <div>
                <dt>Effort moyen</dt>
                <dd className="stat-effort">
                  {sessionStats.averageEffort !== null
                    ? sessionStats.averageEffort.toLocaleString('fr-FR', {
                        maximumFractionDigits: 1,
                      })
                    : '—'}{' '}
                  <small>/ 10</small>
                </dd>
              </div>
            </dl>
          </GlassPanel>
          <GlassPanel className="stats-detail">
            <section aria-labelledby="feedback-title">
              <h2 id="feedback-title" className="panel-title">
                Mes ressentis
              </h2>
              <dl>
                {(
                  [
                    ['too_easy', 'Trop facile'],
                    ['good', 'Bien dosé'],
                    ['too_hard', 'Trop difficile'],
                  ] as const
                ).map(([key, label]) => (
                  <div className="stat-row" key={key}>
                    <div>
                      <dt>{label}</dt>
                      <dd>{sessionStats.feedbackCounts[key]}</dd>
                    </div>
                    <div className="stat-bar" aria-hidden="true">
                      <span
                        style={{
                          width: `${(sessionStats.feedbackCounts[key] / Math.max(1, sessionStats.totalCompleted)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </dl>
              <p className="muted-copy mt-7 text-sm">
                Dernière séance terminée
                <br />
                <span className="text-white">
                  {sessionStats.lastCompletedAt ? formatDate(sessionStats.lastCompletedAt) : '—'}
                </span>
              </p>
            </section>
            <section aria-labelledby="levels-title">
              <h2 id="levels-title" className="panel-title">
                Niveaux
              </h2>
              <dl>
                {Object.entries(stats.byLevel).map(([level, count]) => (
                  <div className="stat-row" key={level}>
                    <div>
                      <dt>{LEVEL_LABELS[level] ?? level}</dt>
                      <dd>{count}</dd>
                    </div>
                    <div className="stat-bar" aria-hidden="true">
                      <span style={{ width: `${(count / Math.max(1, stats.total)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </dl>
              <p className="muted-copy mt-7 text-sm">
                Niveau principal
                <br />
                <span className="text-white">{stats.total > 0 ? topLevel : '—'}</span>
              </p>
            </section>
            <section aria-labelledby="sports-title">
              <h2 id="sports-title" className="panel-title">
                Sports
              </h2>
              {topSports.length ? (
                <dl>
                  {topSports.map(([sport, count]) => (
                    <div className="stat-row" key={sport}>
                      <div>
                        <dt className="capitalize">{sport}</dt>
                        <dd>{count}</dd>
                      </div>
                      <div className="stat-bar" aria-hidden="true">
                        <span style={{ width: `${(count / Math.max(1, stats.total)) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="muted-copy">Aucun sport pour le moment.</p>
              )}
            </section>
          </GlassPanel>
        </>
      )}
    </section>
  );
}
