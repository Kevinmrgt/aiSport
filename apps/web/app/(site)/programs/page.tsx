import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import { ProgramCard } from '@/components/ProgramCard';
import { EmptyState } from '@/components/PremiumPrimitives';

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
    try {
      await serverApi.deleteProgram(id);
      revalidatePath('/programs');
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Impossible de supprimer le programme.',
      };
    }
  }

  const { programs, total, hasMore } = await serverApi.getPrograms({ page });
  const totalPages = Math.ceil(total / 9);

  function pageUrl(p: number) {
    return `/programs?page=${p}`;
  }

  return (
    <section aria-labelledby="programs-title" className="space-y-7">
      <header className="page-heading">
        <div>
          <h1 id="programs-title" className="page-title">
            Mes programmes
          </h1>
          <p className="muted-copy mt-3">
            {total} programme{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/programs/generate" className="action-primary">
          Nouveau programme
        </Link>
      </header>
      {programs.length === 0 ? (
        <EmptyState
          title="Aucun programme pour le moment"
          description="Créez un programme pour organiser vos prochaines semaines."
          href="/programs/generate"
          cta="Créer un programme"
        />
      ) : (
        <>
          <ul
            className="program-list"
            aria-label={`${programs.length} programme${programs.length > 1 ? 's' : ''} sur ${total}`}
          >
            {programs.map((program) => (
              <ProgramCard key={program.id} program={program} onDelete={handleDelete} />
            ))}
          </ul>
          {totalPages > 1 && (
            <nav aria-label="Pagination des programmes" className="pagination">
              {page > 1 ? (
                <Link href={pageUrl(page - 1)} className="action-secondary">
                  Précédent
                </Link>
              ) : (
                <span aria-disabled="true">Précédent</span>
              )}
              <span aria-current="page">
                {page} / {totalPages}
              </span>
              {hasMore ? (
                <Link href={pageUrl(page + 1)} className="action-secondary">
                  Suivant
                </Link>
              ) : (
                <span aria-disabled="true">Suivant</span>
              )}
            </nav>
          )}
        </>
      )}
    </section>
  );
}
