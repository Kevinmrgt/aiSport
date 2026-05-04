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
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <header className="lg:sticky lg:top-28">
        <p className="section-kicker mb-2">Plan progressif</p>
        <h1 className="page-title">Générer un programme</h1>
        <p className="muted-copy mt-4 max-w-md">
          Construisez un cycle de plusieurs semaines avec progression, repos et séances calibrées.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {['2 à 4 semaines', '2 à 5 séances', 'Objectifs guidés'].map((label) => (
            <div key={label} className="metric-card">
              <p className="break-words text-lg font-black text-white">{label}</p>
              <p className="mt-1 text-xs text-primary-300">Personnalisé par IA</p>
            </div>
          ))}
        </div>
      </header>

      <ProgramForm onSubmit={handleGenerate} />
    </div>
  );
}
