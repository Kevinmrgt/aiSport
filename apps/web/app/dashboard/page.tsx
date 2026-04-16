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

  const topSports = Object.entries(stats.bySport)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <section aria-labelledby="dashboard-title">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 id="dashboard-title" className="text-3xl font-bold text-gray-900">
            Mon tableau de bord
          </h1>
          <p className="mt-1 text-gray-500">
            Bonjour, {session.user.name ?? session.user.email}
          </p>
        </div>
        <Link
          href="/generate"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Générer un entraînement
        </Link>
      </div>

      {stats.total === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
          <p aria-hidden="true" className="text-5xl mb-4">🏋️</p>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Aucun entraînement encore
          </h2>
          <p className="text-gray-600 mb-6">
            Générez votre premier programme pour voir vos statistiques ici.
          </p>
          <Link
            href="/generate"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Commencer
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <dt className="text-sm font-medium text-gray-500">Total d&apos;entraînements</dt>
              <dd className="mt-2 text-4xl font-bold text-primary-600" aria-label={`${stats.total} entraînements au total`}>
                {stats.total}
              </dd>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <dt className="text-sm font-medium text-gray-500">Niveau le plus pratiqué</dt>
              <dd className="mt-2 text-2xl font-bold text-gray-900">
                {(() => {
                  const top = Object.entries(stats.byLevel).sort(([, a], [, b]) => b - a)[0];
                  return top ? LEVEL_LABELS[top[0]] ?? top[0] : '—';
                })()}
              </dd>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <dt className="text-sm font-medium text-gray-500">Dernier entraînement</dt>
              <dd className="mt-2 text-lg font-semibold text-gray-900">
                {stats.lastGenerated ? formatDate(stats.lastGenerated) : '—'}
              </dd>
            </div>
          </dl>

          {/* Répartition par niveau */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Répartition par niveau</h2>
            <dl className="space-y-3" aria-label="Répartition des entraînements par niveau">
              {Object.entries(stats.byLevel).map(([level, count]) => {
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={level}>
                    <div className="flex justify-between text-sm mb-1">
                      <dt className="text-gray-600">{LEVEL_LABELS[level] ?? level}</dt>
                      <dd className="font-medium text-gray-900">
                        {count} ({pct}%)
                      </dd>
                    </div>
                    <div
                      className="h-2 rounded-full bg-gray-100 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${LEVEL_LABELS[level] ?? level} : ${pct}%`}
                    >
                      <div
                        className="h-full rounded-full bg-primary-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </dl>
          </div>

          {/* Sports pratiqués */}
          {topSports.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Sports pratiqués</h2>
              <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label="Sports pratiqués">
                {topSports.map(([sport, count]) => (
                  <li
                    key={sport}
                    className="flex flex-col items-center justify-center p-4 rounded-lg bg-gray-50 text-center"
                  >
                    <span className="text-lg font-bold text-primary-600">{count}</span>
                    <span className="text-sm text-gray-600 mt-1 capitalize">{sport}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Lien vers la liste */}
          <div className="text-center">
            <Link
              href="/workouts"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline focus:outline-none focus:underline"
            >
              Voir tous mes entraînements →
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
