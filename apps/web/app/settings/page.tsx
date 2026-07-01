import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { serverApi } from '@/lib/server-api';
import type { SaveAiSettingsInput } from '@/lib/server-api';
import { SettingsForm } from '@/components/SettingsForm';
import { GlassPanel, MetricPill } from '@/components/PremiumPrimitives';

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const aiSettings = await serverApi.getAiSettings().catch(() => ({
    provider: 'openai' as const,
    hasApiKey: false,
    model: null,
  }));

  async function handleSave(data: SaveAiSettingsInput): Promise<{ error?: string } | void> {
    'use server';
    try {
      await serverApi.saveAiSettings(data);
      revalidatePath('/settings');
      revalidatePath('/generate');
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erreur lors de la sauvegarde' };
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <GlassPanel className="abstract-surface mobile-compact-header p-5 sm:p-6">
        <p className="section-kicker mb-3">Configuration</p>
        <h1 id="settings-title" className="page-title">
          Parametres Alcide
        </h1>
        <p className="muted-copy mt-4">
          Une page volontairement plus calme : elle sert a piloter le moteur de generation sans
          transformer l interface en panneau technique.
        </p>
        <div className="mobile-header-metrics mt-6 grid gap-2">
          <MetricPill icon="spark" label="Provider" value="OpenAI" tone="lime" />
          <MetricPill icon="settings" label="Secret" value="Serveur" />
        </div>
      </GlassPanel>

      <SettingsForm initial={aiSettings} onSave={handleSave} />
    </div>
  );
}
