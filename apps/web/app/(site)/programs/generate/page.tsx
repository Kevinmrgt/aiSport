import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ProgramForm } from '@/components/ProgramForm';
import { serverApi } from '@/lib/server-api';
import type { GenerateProgramInput } from '@alcide/shared';

export default async function GenerateProgramPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login?callbackUrl=%2Fprograms%2Fgenerate');
  }

  const generationQuota = await serverApi.getGenerationQuota();

  async function handleGenerate(data: GenerateProgramInput): Promise<{ error?: string } | void> {
    'use server';
    let programId: string;
    try {
      const program = await serverApi.generateProgram(data);
      programId = program.id;
    } catch (error) {
      console.error('[GenerateProgramPage] Erreur generation programme:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      const message =
        error instanceof Error ? error.message : 'Erreur inattendue, veuillez reessayer';
      return { error: message };
    }
    redirect(`/programs/${programId}`);
  }

  return (
    <section className="form-page program-form-page">
      <Link href="/programs" className="mb-6 inline-flex text-sm underline underline-offset-4">
        Mes programmes
      </Link>
      <header className="page-heading">
        <h1 className="page-title">Créer un programme</h1>
      </header>
      <ProgramForm onSubmit={handleGenerate} generationQuota={generationQuota} />
    </section>
  );
}
