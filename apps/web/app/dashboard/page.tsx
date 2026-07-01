import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import { EmptyState, GlassPanel, MetricPill, ProgressRing } from '@/components/PremiumPrimitives';

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

  const effortPercent =
    sessionStats.averageEffort !== null ? Math.round((sessionStats.averageEffort / 10) * 100) : 0;

  return (
    <section aria-labelledby="dashboard-title" className="space-y-6">
      <GlassPanel className="abstract-surface mobile-compact-header p-5 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="section-kicker mb-3">Dashboard</p>
            <h1 id="dashboard-title" className="page-title">
              Votre progression
            </h1>
            <p className="muted-copy mt-3 max-w-2xl">
              Synthese de vos seances creees, terminees et ressenties pour piloter le prochain
              entrainement.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="mobile-header-metrics">
              <ProgressRing value={effortPercent} label="effort" size="lg" />
            </div>
            <Link href="/generate" className="action-primary mobile-header-action">
              Nouvelle seance
            </Link>
          </div>
        </div>
      </GlassPanel>

      {stats.total === 0 && sessionStats.totalCompleted === 0 ? (
        <EmptyState
          title="Aucune activite encore"
          description="Creez une premiere seance pour activer le dashboard et commencer le suivi."
          href="/generate"
          cta="Commencer"
        />
      ) : (
        <div className="space-y-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="metric-card">
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                Seances creees
              </dt>
              <dd className="mt-3 text-5xl font-black tabular-nums text-primary-300">
                {stats.total}
              </dd>
            </div>

            <div className="metric-card">
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                Termine
              </dt>
              <dd className="mt-3 text-5xl font-black tabular-nums text-white">
                {sessionStats.totalCompleted}
              </dd>
            </div>

            <div className="metric-card">
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                Temps realise
              </dt>
              <dd className="mt-3 text-3xl font-black text-white">
                {formatDuration(sessionStats.totalDurationSeconds)}
              </dd>
            </div>

            <div className="metric-card">
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                Effort moyen
              </dt>
              <dd className="mt-3 text-3xl font-black tabular-nums text-white">
                {sessionStats.averageEffort !== null ? sessionStats.averageEffort.toFixed(1) : '--'}
                <span className="text-lg text-zinc-500"> / 10</span>
              </dd>
            </div>
          </dl>

          <div className="grid gap-4 lg:grid-cols-3">
            <GlassPanel className="p-5" variant="soft">
              <h2 className="section-kicker mb-5">Execution</h2>
              <dl className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-sm text-zinc-300">Derniere terminee</dt>
                  <dd className="text-right text-sm font-bold text-white">
                    {sessionStats.lastCompletedAt ? formatDate(sessionStats.lastCompletedAt) : '--'}
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <MetricPill icon="check" label="Facile" value={`${sessionStats.feedbackCounts.too_easy}`} />
                  <MetricPill icon="target" label="Dose" value={`${sessionStats.feedbackCounts.good}`} tone="lime" />
                  <MetricPill icon="flame" label="Dur" value={`${sessionStats.feedbackCounts.too_hard}`} tone="orange" />
                </div>
              </dl>
            </GlassPanel>

            <GlassPanel className="p-5" variant="soft">
              <h2 className="section-kicker mb-5">Niveau</h2>
              <div className="mb-4 rounded-[1.4rem] border border-primary-300/[0.16] bg-zinc-950/[0.46] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-300">
                  Principal
                </p>
                <p className="mt-2 text-2xl font-black text-white">{topLevel}</p>
              </div>
              <dl className="space-y-2">
                {Object.entries(stats.byLevel).map(([level, count]) => (
                  <div key={level} className="flex items-center justify-between gap-4 rounded-full bg-zinc-950/[0.42] px-3 py-2">
                    <dt className="text-sm text-zinc-300">{LEVEL_LABELS[level] ?? level}</dt>
                    <dd className="text-sm font-black tabular-nums text-primary-300">{count}</dd>
                  </div>
                ))}
              </dl>
            </GlassPanel>

            <GlassPanel className="p-5" variant="soft">
              <h2 className="section-kicker mb-5">Sports</h2>
              <dl className="space-y-2">
                {topSports.length > 0 ? (
                  topSports.map(([sport, count]) => (
                    <div key={sport} className="flex items-center justify-between gap-4 rounded-full bg-zinc-950/[0.42] px-3 py-2">
                      <dt className="text-sm capitalize text-zinc-300">{sport}</dt>
                      <dd className="text-sm font-black tabular-nums text-primary-300">{count}</dd>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-300">Aucun sport pour le moment.</p>
                )}
              </dl>
            </GlassPanel>
          </div>
        </div>
      )}
    </section>
  );
}
