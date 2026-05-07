import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import { ProgramCard } from '@/components/ProgramCard';

// OWASP A01: route protégée
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

  // Server Action : suppression avec ownership vérifié côté backend (OWASP A01)
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
    <section aria-labelledby="programs-title">
      {/* En-tête */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-kicker mb-2">Cycles guidés</p>
          <h1 id="programs-title" className="page-title">
            Mes programmes
          </h1>
          <p className="muted-copy mt-2">
            Des blocs de plusieurs semaines pour progresser sans perdre le fil.
          </p>
        </div>
        <Link
          href="/programs/generate"
          className="action-primary w-full sm:w-auto"
        >
          + Nouveau programme
        </Link>
      </div>

      <p className="mb-6 text-sm font-semibold text-primary-300">{total} programme{total !== 1 ? 's' : ''}</p>

      {programs.length === 0 ? (
        <div className="surface mx-auto max-w-xl p-8 text-center">
          <h2 className="mb-2 text-xl font-black text-white">
            Aucun programme pour l&apos;instant
          </h2>
          <p className="muted-copy mb-6">
            Générez votre premier programme d&apos;entraînement progressif sur plusieurs semaines.
          </p>
          <Link
            href="/programs/generate"
          className="action-primary w-full sm:w-auto"
          >
            Créer un programme
          </Link>
        </div>
      ) : (
        <>
          <ul
            className="grid gap-3 lg:grid-cols-2"
            aria-label={`${programs.length} programme${programs.length > 1 ? 's' : ''} sur ${total}`}
          >
            {programs.map((program) => (
              <ProgramCard key={program.id} program={program} onDelete={handleDelete} />
            ))}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              aria-label="Pagination des programmes"
              className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm sm:gap-6"
            >
              {page > 1 ? (
                <Link
                  href={pageUrl(page - 1)}
                  className="text-zinc-400 transition-colors hover:text-primary-300 focus-visible:outline-none focus-visible:underline"
                  aria-label="Page précédente"
                >
                  Précédent
                </Link>
              ) : (
                <span className="select-none text-zinc-700">Précédent</span>
              )}

              <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-200" aria-current="page">
                {page} / {totalPages}
              </span>

              {hasMore ? (
                <Link
                  href={pageUrl(page + 1)}
                  className="text-zinc-400 transition-colors hover:text-primary-300 focus-visible:outline-none focus-visible:underline"
                  aria-label="Page suivante"
                >
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
