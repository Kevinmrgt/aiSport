interface MetricSkeletonProps {
  count?: number;
}

function PulseBlock({ className }: { readonly className: string }) {
  return <div className={`animate-pulse rounded bg-white/10 ${className}`} aria-hidden="true" />;
}

export function HeaderLoading({
  titleWidth = 'w-3/4',
  metrics = 3,
}: {
  readonly titleWidth?: string;
  readonly metrics?: number;
}) {
  return (
    <div className="glass-panel abstract-surface mobile-compact-header p-5 sm:p-6" aria-hidden="true">
      <PulseBlock className="mb-4 h-7 w-28 rounded-full bg-primary-300/25" />
      <PulseBlock className={`h-12 ${titleWidth} max-w-xl rounded-2xl`} />
      <PulseBlock className="mt-4 h-4 w-full max-w-2xl" />
      <PulseBlock className="mt-2 h-4 w-2/3 max-w-xl" />
      <MetricRow count={metrics} />
    </div>
  );
}

export function MetricRow({ count = 3 }: MetricSkeletonProps) {
  return (
    <div className="mobile-header-metrics mt-6 grid gap-2 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <PulseBlock key={index} className="h-14 rounded-full bg-white/[0.08]" />
      ))}
    </div>
  );
}

export function CardGridLoading({ count = 4 }: { readonly count?: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="glass-soft p-4">
          <div className="flex items-center gap-4">
            <PulseBlock className="h-14 w-14 shrink-0 rounded-full bg-primary-300/20" />
            <div className="flex-1 space-y-2">
              <PulseBlock className="h-4 w-2/3" />
              <PulseBlock className="h-3 w-1/3" />
            </div>
            <PulseBlock className="h-9 w-20 rounded-full bg-white/[0.08]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardLoadingSkeleton() {
  return (
    <section aria-labelledby="dashboard-title" aria-busy="true" className="space-y-6">
      <HeaderLoading titleWidth="w-80" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="metric-card">
            <PulseBlock className="h-3 w-28 bg-primary-300/20" />
            <PulseBlock className="mt-4 h-10 w-20 rounded-xl" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="glass-soft space-y-3 p-5">
            <PulseBlock className="h-3 w-24 bg-primary-300/20" />
            <PulseBlock className="h-16 w-full rounded-2xl" />
            <PulseBlock className="h-10 w-full rounded-full" />
          </div>
        ))}
      </div>
      <p className="sr-only">Chargement du dashboard en cours...</p>
    </section>
  );
}

export function ListLoadingSkeleton({
  label,
  titleWidth = 'w-80',
}: {
  readonly label: string;
  readonly titleWidth?: string;
}) {
  return (
    <section aria-busy="true" aria-label={label} className="space-y-6">
      <HeaderLoading titleWidth={titleWidth} />
      <CardGridLoading count={6} />
      <p className="sr-only">{label}</p>
    </section>
  );
}

export function SettingsLoadingSkeleton() {
  return (
    <div
      className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.85fr_1.15fr]"
      aria-busy="true"
      aria-label="Chargement des parametres"
    >
      <HeaderLoading titleWidth="w-72" metrics={2} />
      <div className="glass-panel space-y-5 p-5 sm:p-6" aria-hidden="true">
        <PulseBlock className="h-3 w-24 bg-primary-300/20" />
        <PulseBlock className="h-12 w-full rounded-2xl" />
        <PulseBlock className="h-12 w-3/4 rounded-2xl" />
        <PulseBlock className="h-12 w-36 rounded-full bg-primary-300/25" />
      </div>
      <p className="sr-only">Chargement des parametres en cours...</p>
    </div>
  );
}
