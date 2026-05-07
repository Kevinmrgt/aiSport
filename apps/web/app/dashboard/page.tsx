import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Debutant',
  intermediate: 'Intermediaire',
  advanced: 'Avance',
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

// OWASP A01: route protegee
export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const [stats, sessionStats] = await Promise.all([
    serverApi.getStats(),
    serverApi.getSessionLogStats().catch(() => ({
      totalCompleted: 0,
      totalDurationSeconds: 0,
      averageEffort: null,
      feedbackCounts: { too_easy: 0, good: 0, too_hard: 0 },
      lastCompletedAt: null,
    })),
  ]);

  const topLevel = (() => {
    const top = Object.entries(stats.byLevel).sort(([, a], [, b]) => b - a)[0];
    return top ? (LEVEL_LABELS[top[0]] ?? top[0]) : '--';
  })();

  const topSports = Object.entries(stats.bySport)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <section aria-labelledby="dashboard-title">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-kicker mb-2">Rapport quotidien</p>
          <h1 id="dashboard-title" className="page-title">
            Dashboard
          </h1>
          <p className="muted-copy mt-2">
            Une vue rapide sur vos seances generees, terminees et votre ressenti.
          </p>
        </div>
        <Link href="/generate" className="action-primary w-full sm:w-auto">
          + Nouvelle seance
        </Link>
      </div>

      {stats.total === 0 && sessionStats.totalCompleted === 0 ? (
        <div className="surface mx-auto max-w-xl p-8 text-center">
          <h2 className="mb-2 text-xl font-black text-white">Aucune seance encore</h2>
          <p className="muted-copy mb-6">
            Generez votre premier programme pour voir vos statistiques ici.
          </p>
          <Link href="/generate" className="action-primary w-full sm:w-auto">
            Commencer
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="metric-card">
              <dt className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Seances creees
              </dt>
              <dd
                className="mt-3 text-5xl font-black tabular-nums text-primary-300"
                aria-label={`${stats.total} seances generees au total`}
              >
                {stats.total}
              </dd>
            </div>

            <div className="metric-card">
              <dt className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Termine
              </dt>
              <dd
                className="mt-3 text-5xl font-black tabular-nums text-white"
                aria-label={`${sessionStats.totalCompleted} seances terminees`}
              >
                {sessionStats.totalCompleted}
              </dd>
            </div>

            <div className="metric-card">
              <dt className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Temps realise
              </dt>
              <dd className="mt-3 text-3xl font-black text-white">
                {formatDuration(sessionStats.totalDurationSeconds)}
              </dd>
            </div>

            <div className="metric-card">
              <dt className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Effort moyen
              </dt>
              <dd className="mt-3 text-3xl font-black tabular-nums text-white">
                {sessionStats.averageEffort !== null ? sessionStats.averageEffort.toFixed(1) : '--'}
                <span className="text-lg text-zinc-500"> / 10</span>
              </dd>
            </div>
          </dl>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="surface p-5" aria-labelledby="execution-title">
              <h2 id="execution-title" className="section-kicker mb-5">
                Execution
              </h2>
              <dl className="space-y-3" aria-label="Synthese des seances terminees">
                <div className="flex items-start justify-between gap-4">
                  <dt className="min-w-0 break-words text-sm text-zinc-300">Derniere terminee</dt>
                  <dd className="text-right text-sm font-bold text-white">
                    {sessionStats.lastCompletedAt ? formatDate(sessionStats.lastCompletedAt) : '--'}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="min-w-0 break-words text-sm text-zinc-300">Trop facile</dt>
                  <dd className="rounded-full bg-white/10 px-3 py-1 text-xs font-black tabular-nums text-primary-300">
                    {sessionStats.feedbackCounts.too_easy}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="min-w-0 break-words text-sm text-zinc-300">Bien dose</dt>
                  <dd className="rounded-full bg-primary-300 px-3 py-1 text-xs font-black tabular-nums text-zinc-950">
                    {sessionStats.feedbackCounts.good}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="min-w-0 break-words text-sm text-zinc-300">Trop dur</dt>
                  <dd className="rounded-full bg-white/10 px-3 py-1 text-xs font-black tabular-nums text-red-200">
                    {sessionStats.feedbackCounts.too_hard}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="surface p-5" aria-labelledby="level-title">
              <h2 id="level-title" className="section-kicker mb-5">
                Par niveau
              </h2>
              <dl className="space-y-3" aria-label="Repartition par niveau">
                <div className="flex items-start justify-between gap-4">
                  <dt className="min-w-0 break-words text-sm text-zinc-300">Niveau principal</dt>
                  <dd className="text-right text-sm font-bold text-white">{topLevel}</dd>
                </div>
                {Object.entries(stats.byLevel).map(([level, count]) => (
                  <div key={level} className="flex items-start justify-between gap-4">
                    <dt className="min-w-0 break-words text-sm text-zinc-300">
                      {LEVEL_LABELS[level] ?? level}
                    </dt>
                    <dd className="rounded-full bg-primary-300 px-3 py-1 text-xs font-black tabular-nums text-zinc-950">
                      {count}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="surface p-5" aria-labelledby="sports-title">
              <h2 id="sports-title" className="section-kicker mb-5">
                Sports pratiques
              </h2>
              <dl className="space-y-3" aria-label="Sports pratiques">
                {topSports.length > 0 ? (
                  topSports.map(([sport, count]) => (
                    <div key={sport} className="flex items-start justify-between gap-4">
                      <dt className="min-w-0 break-words text-sm capitalize text-zinc-300">{sport}</dt>
                      <dd className="rounded-full bg-white/10 px-3 py-1 text-xs font-black tabular-nums text-primary-300">
                        {count}
                      </dd>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-400">Aucun sport genere pour le moment.</p>
                )}
              </dl>
            </section>
          </div>

          <div className="pt-2">
            <Link
              href="/workouts"
              className="text-sm font-semibold text-primary-300 transition hover:text-primary-100 focus-visible:outline-none focus-visible:underline"
            >
              Voir toutes mes seances
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
