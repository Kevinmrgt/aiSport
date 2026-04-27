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
  searchParams: { page?: string };
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const page = Math.max(1, Number(searchParams.page) || 1);

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
      <div className="flex items-center justify-between mb-8">
        <h1 id="programs-title" className="text-2xl font-bold text-zinc-900">
          Mes programmes
        </h1>
        <Link
          href="/programs/generate"
          className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
        >
          Nouveau programme
        </Link>
      </div>

      <p className="text-sm text-zinc-400 mb-6">{total} programme{total !== 1 ? 's' : ''}</p>

      {programs.length === 0 ? (
        <div className="py-24 text-center">
          <h2 className="text-base font-medium text-zinc-900 mb-2">
            Aucun programme pour l&apos;instant
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            Générez votre premier programme d&apos;entraînement progressif sur plusieurs semaines.
          </p>
          <Link
            href="/programs/generate"
            className="inline-flex items-center justify-center px-5 py-2 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
          >
            Créer un programme
          </Link>
        </div>
      ) : (
        <>
          <ul
            className="divide-y divide-zinc-100"
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
              className="mt-8 flex items-center justify-center gap-6 text-sm"
            >
              {page > 1 ? (
                <Link
                  href={pageUrl(page - 1)}
                  className="text-zinc-500 hover:text-zinc-900 transition-colors focus-visible:outline-none focus-visible:underline"
                  aria-label="Page précédente"
                >
                  ← Précédent
                </Link>
              ) : (
                <span className="text-zinc-300 select-none">← Précédent</span>
              )}

              <span className="text-zinc-400" aria-current="page">
                {page} / {totalPages}
              </span>

              {hasMore ? (
                <Link
                  href={pageUrl(page + 1)}
                  className="text-zinc-500 hover:text-zinc-900 transition-colors focus-visible:outline-none focus-visible:underline"
                  aria-label="Page suivante"
                >
                  Suivant →
                </Link>
              ) : (
                <span className="text-zinc-300 select-none">Suivant →</span>
              )}
            </nav>
          )}
        </>
      )}
    </section>
  );
}
