import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ProgramForm } from '@/components/ProgramForm';
import { serverApi } from '@/lib/server-api';
import type { GenerateProgramInput } from '@sportcoach/shared';

// OWASP A01: route protégée — redirection si pas de session
export default async function GenerateProgramPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Server Action : s'exécute côté serveur, pas d'exposition de token au client.
  // Pattern try-catch + return error (Next.js remplace les throws par un message
  // générique en production — voir docs/bloc4/bugs/ pour le contexte).
  async function handleGenerate(data: GenerateProgramInput): Promise<{ error?: string } | void> {
    'use server';
    let programId: string;
    try {
      const program = await serverApi.generateProgram(data);
      programId = program.id;
    } catch (error) {
      // OWASP A09: logger l'erreur réelle côté serveur (visible dans les logs Vercel)
      console.error('[GenerateProgramPage] Erreur génération programme:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      const message =
        error instanceof Error ? error.message : 'Erreur inattendue, veuillez réessayer';
      return { error: message };
    }
    // redirect() en dehors du try-catch — il throw NEXT_REDIRECT en interne
    redirect(`/programs/${programId}`);
  }

  return (
    <div className="max-w-lg mx-auto">
      <ProgramForm onSubmit={handleGenerate} />
    </div>
  );
}
