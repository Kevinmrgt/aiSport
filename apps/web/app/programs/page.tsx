import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import { ProgramCard } from '@/components/ProgramCard';
import { EmptyState, GlassPanel, MetricPill } from '@/components/PremiumPrimitives';

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const query = await searchParams;
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const page = Math.max(1, Number(query.page) || 1);

  async function handleDelete(id: string) {
    'use server';
    await serverApi.deleteProgram(id);
    revalidatePath('/programs');
  }

  const { programs, total, hasMore } = await serverApi.getPrograms({ page });
  const totalPages = Math.ceil(total / 9);

  function pageUrl(p: number) {
    return `/programs?page=${p}`;
  }

  return (
    <section aria-labelledby="programs-title" className="space-y-6">
      <GlassPanel className="abstract-surface mobile-compact-header p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker mb-3">Cycles guides</p>
            <h1 id="programs-title" className="page-title">
              Mes programmes
            </h1>
            <p className="muted-copy mt-3 max-w-2xl">
              Des progressions multi-semaines pour structurer vos objectifs sans repartir de zero.
            </p>
          </div>
          <Link href="/programs/generate" className="action-primary mobile-header-action w-full sm:w-auto">
            Nouveau programme
          </Link>
        </div>
        <div className="mobile-header-metrics mt-6 grid gap-2 sm:grid-cols-3">
          <MetricPill icon="layers" label="Programmes" value={`${total}`} tone="lime" />
          <MetricPill icon="calendar" label="Format" value="2-4 sem." />
          <MetricPill icon="target" label="Objectif" value="Progression" tone="orange" />
        </div>
      </GlassPanel>

      {programs.length === 0 ? (
        <EmptyState
          title="Aucun programme pour l instant"
          description="Planifiez un premier cycle progressif pour organiser vos prochaines semaines."
          href="/programs/generate"
          cta="Planifier un cycle"
        />
      ) : (
        <>
          <ul
            className="grid gap-4 lg:grid-cols-2"
            aria-label={`${programs.length} programme${programs.length > 1 ? 's' : ''} sur ${total}`}
          >
            {programs.map((program) => (
              <ProgramCard key={program.id} program={program} onDelete={handleDelete} />
            ))}
          </ul>

          {totalPages > 1 && (
            <nav
              aria-label="Pagination des programmes"
              className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm sm:gap-6"
            >
              {page > 1 ? (
                <Link href={pageUrl(page - 1)} className="action-secondary min-h-10 px-4 py-2">
                  Precedent
                </Link>
              ) : (
                <span className="select-none text-zinc-700">Precedent</span>
              )}

              <span className="premium-chip" aria-current="page">
                {page} / {totalPages}
              </span>

              {hasMore ? (
                <Link href={pageUrl(page + 1)} className="action-secondary min-h-10 px-4 py-2">
                  Suivant
                </Link>
              ) : (
                <span className="select-none text-zinc-700">Suivant</span>
              )}
            </nav>
          )}
        </>
      )}
    </section>
  );
}
