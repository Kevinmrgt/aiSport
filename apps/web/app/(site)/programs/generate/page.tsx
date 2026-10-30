import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ProgramForm } from '@/components/ProgramForm';
import type { GenerationResult } from '@/lib/generation-operation';
import { serverApi, ServerApiError } from '@/lib/server-api';
import type { GenerateProgramInput } from '@alcide/shared';

export default async function GenerateProgramPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login?callbackUrl=%2Fprograms%2Fgenerate');
  }

  const generationQuota = await serverApi.getGenerationQuota();

  async function handleGenerate(data: GenerateProgramInput, operationId: string): Promise<GenerationResult | void> {
    'use server';
    let programId: string;
    try {
      const program = await serverApi.generateProgram(data, operationId);
      programId = program.id;
    } catch (error) {
      console.error('[Generation] Échec du service', {
        status: error instanceof ServerApiError ? error.status : undefined,
      });
      const message =
        error instanceof Error ? error.message : 'Erreur inattendue, veuillez reessayer';
      return { error: message, retryWithNewOperation: error instanceof ServerApiError && error.code === 'AI_OPERATION_FAILED' };
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
