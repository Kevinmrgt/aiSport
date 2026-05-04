import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';

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

// OWASP A01: route protégée
export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const stats = await serverApi.getStats();

  const topLevel = (() => {
    const top = Object.entries(stats.byLevel).sort(([, a], [, b]) => b - a)[0];
    return top ? (LEVEL_LABELS[top[0]] ?? top[0]) : '—';
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
            Une vue rapide sur vos séances générées et vos sports dominants.
          </p>
        </div>
        <Link
          href="/generate"
          className="action-primary w-full sm:w-auto"
        >
          + Nouvelle séance
        </Link>
      </div>

      {stats.total === 0 ? (
        <div className="surface mx-auto max-w-xl p-8 text-center">
          <h2 className="mb-2 text-xl font-black text-white">Aucune séance encore</h2>
          <p className="muted-copy mb-6">
            Générez votre premier programme pour voir vos statistiques ici.
          </p>
          <Link
            href="/generate"
          className="action-primary w-full sm:w-auto"
          >
            Commencer
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="metric-card">
              <dt className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Séances
              </dt>
              <dd
                className="mt-3 text-5xl font-black tabular-nums text-primary-300"
                aria-label={`${stats.total} séances au total`}
              >
                {stats.total}
              </dd>
            </div>

            <div className="metric-card">
              <dt className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Niveau principal
              </dt>
              <dd className="mt-3 text-3xl font-black text-white">{topLevel}</dd>
            </div>

            <div className="metric-card">
              <dt className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Dernière
              </dt>
              <dd className="mt-3 text-lg font-bold text-white">
                {stats.lastGenerated ? formatDate(stats.lastGenerated) : '—'}
              </dd>
            </div>
          </dl>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="surface p-5" aria-labelledby="level-title">
              <h2 id="level-title" className="section-kicker mb-5">
                Par niveau
              </h2>
              <dl className="space-y-3" aria-label="Répartition par niveau">
                {Object.entries(stats.byLevel).map(([level, count]) => (
                  <div key={level} className="flex items-start justify-between gap-4">
                    <dt className="min-w-0 break-words text-sm text-zinc-300">{LEVEL_LABELS[level] ?? level}</dt>
                    <dd className="rounded-full bg-primary-300 px-3 py-1 text-xs font-black tabular-nums text-zinc-950">
                      {count}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="surface p-5" aria-labelledby="sports-title">
              <h2 id="sports-title" className="section-kicker mb-5">
                Sports pratiqués
              </h2>
              <dl className="space-y-3" aria-label="Sports pratiqués">
                {topSports.map(([sport, count]) => (
                  <div key={sport} className="flex items-start justify-between gap-4">
                    <dt className="min-w-0 break-words text-sm capitalize text-zinc-300">{sport}</dt>
                    <dd className="rounded-full bg-white/10 px-3 py-1 text-xs font-black tabular-nums text-primary-300">
                      {count}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>

          <div className="pt-2">
            <Link
              href="/workouts"
              className="text-sm font-semibold text-primary-300 transition hover:text-primary-100 focus-visible:outline-none focus-visible:underline"
            >
              Voir toutes mes séances
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
