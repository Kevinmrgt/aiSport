import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Icon } from '@/components/ui/Icon';
import { GlassPanel, MetricPill } from '@/components/PremiumPrimitives';

const COACH_STEPS = [
  {
    title: 'Décrivez votre objectif',
    description: 'Indiquez le sport, la durée et les contraintes à prendre en compte.',
  },
  {
    title: 'Recevez une proposition adaptée',
    description: 'Alcide construit automatiquement une séance ou un cycle progressif.',
  },
  {
    title: 'Avancez à votre rythme',
    description: 'Utilisez le timer et vos retours pour suivre votre progression.',
  },
] as const;

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <GlassPanel className="abstract-surface mobile-compact-header p-5 sm:p-6">
        <p className="section-kicker mb-3">Accompagnement</p>
        <h1 id="settings-title" className="page-title">
          Mon coach Alcide
        </h1>
        <p className="muted-copy mt-4">
          Alcide adapte automatiquement chaque proposition à votre niveau, votre objectif et votre
          temps disponible.
        </p>
        <div className="mobile-header-metrics mt-6 grid gap-2">
          <MetricPill icon="spark" label="Seances" value="Sur mesure" tone="lime" />
          <MetricPill icon="layers" label="Programmes" value="Progressifs" />
        </div>
      </GlassPanel>

      <GlassPanel className="flex flex-col gap-6 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-kicker mb-3">Votre parcours</p>
            <h2 className="text-3xl font-black text-white">Un accompagnement simple</h2>
          </div>
          <span className="icon-bubble bg-primary-300 text-zinc-950">
            <Icon name="target" className="h-4 w-4" />
          </span>
        </div>

        <div className="grid gap-3">
          {COACH_STEPS.map((item) => (
            <div
              key={item.title}
              className="rounded-[1.25rem] border border-white/10 bg-zinc-950/[0.45] p-4"
            >
              <p className="font-bold text-primary-100">{item.title}</p>
              <p className="muted-copy mt-1">{item.description}</p>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
