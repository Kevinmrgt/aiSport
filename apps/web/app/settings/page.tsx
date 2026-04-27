import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import type { SaveAiSettingsInput } from '@/lib/server-api';
import { SettingsForm } from '@/components/SettingsForm';

// OWASP A01: route protégée
export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const aiSettings = await serverApi.getAiSettings().catch(() => ({
    provider: 'mistral' as const,
    hasApiKey: false,
    model: null,
  }));

  async function handleSave(data: SaveAiSettingsInput): Promise<{ error?: string } | void> {
    'use server';
    try {
      await serverApi.saveAiSettings(data);
      revalidatePath('/settings');
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erreur lors de la sauvegarde' };
    }
  }

  async function handleDeleteKey(): Promise<{ error?: string } | void> {
    'use server';
    try {
      await serverApi.deleteAiKey();
      revalidatePath('/settings');
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erreur lors de la suppression' };
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <header className="mb-8">
        <h1 id="settings-title" className="text-2xl font-bold text-zinc-900 mb-2">
          Paramètres IA
        </h1>
        <p className="text-sm text-zinc-400">
          Configurez votre fournisseur d&apos;IA et votre clé API personnelle.
        </p>
      </header>

      <SettingsForm
        initial={aiSettings}
        onSave={handleSave}
        onDeleteKey={handleDeleteKey}
      />
    </div>
  );
}
