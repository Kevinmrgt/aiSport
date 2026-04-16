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
      <div className="flex items-center justify-between mb-12">
        <h1 id="dashboard-title" className="text-2xl font-bold text-zinc-900">
          Dashboard
        </h1>
        <Link
          href="/generate"
          className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
        >
          Nouvelle séance
        </Link>
      </div>

      {stats.total === 0 ? (
        <div className="py-24 text-center">
          <h2 className="text-base font-medium text-zinc-900 mb-2">Aucune séance encore</h2>
          <p className="text-sm text-zinc-400 mb-6">
            Générez votre premier programme pour voir vos statistiques ici.
          </p>
          <Link
            href="/generate"
            className="inline-flex items-center justify-center px-5 py-2 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
          >
            Commencer
          </Link>
        </div>
      ) : (
        <div>
          {/* KPIs — typographie seule, pas de cards */}
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-10 pb-10 border-b border-zinc-100">
            <div>
              <dt className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-2">
                Séances générées
              </dt>
              <dd
                className="text-5xl font-bold text-zinc-900 tabular-nums"
                aria-label={`${stats.total} séances au total`}
              >
                {stats.total}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-2">
                Niveau principal
              </dt>
              <dd className="text-3xl font-bold text-zinc-900">{topLevel}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-2">
                Dernière séance
              </dt>
              <dd className="text-lg font-semibold text-zinc-900">
                {stats.lastGenerated ? formatDate(stats.lastGenerated) : '—'}
              </dd>
            </div>
          </dl>

          {/* Répartition par niveau */}
          <div className="py-8 border-b border-zinc-100">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">
              Par niveau
            </h2>
            <dl className="space-y-2" aria-label="Répartition par niveau">
              {Object.entries(stats.byLevel).map(([level, count]) => (
                <div key={level} className="flex justify-between text-sm">
                  <dt className="text-zinc-500">{LEVEL_LABELS[level] ?? level}</dt>
                  <dd className="font-medium text-zinc-900 tabular-nums">{count}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Sports pratiqués */}
          {topSports.length > 0 && (
            <div className="py-8 border-b border-zinc-100">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">
                Sports pratiqués
              </h2>
              <dl className="space-y-2" aria-label="Sports pratiqués">
                {topSports.map(([sport, count]) => (
                  <div key={sport} className="flex justify-between text-sm">
                    <dt className="text-zinc-500 capitalize">{sport}</dt>
                    <dd className="font-medium text-zinc-900 tabular-nums">{count}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="pt-6">
            <Link
              href="/workouts"
              className="text-sm text-zinc-400 hover:text-zinc-900 transition-colors focus-visible:outline-none focus-visible:underline"
            >
              Voir toutes mes séances →
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
