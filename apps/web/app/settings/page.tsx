import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { Icon } from '@/components/ui/Icon';
import { GlassPanel } from '@/components/PremiumPrimitives';

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
    <section className="coach-page" aria-labelledby="settings-title">
      <header className="page-heading">
        <h1 id="settings-title" className="page-title">
          Mon coach
        </h1>
      </header>
      <GlassPanel className="panel-padding">
        <h2 className="panel-title">Comment ça marche</h2>
        <ol>
          {COACH_STEPS.map((item, index) => (
            <li key={item.title} className="coach-step">
              <span className="week-session-number">{index + 1}</span>
              <div className="flex-1">
                <h3>{item.title}</h3>
                <p className="muted-copy">{item.description}</p>
              </div>
              <Icon
                name={index === 0 ? 'sliders' : index === 1 ? 'list' : 'chart'}
                className="h-9 w-9 text-primary-200"
              />
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/generate" className="action-primary">
            Créer une séance <Icon name="arrow-right" className="h-4 w-4" />
          </Link>
          <Link href="/programs/generate" className="action-secondary">
            Créer un programme
          </Link>
        </div>
      </GlassPanel>
    </section>
  );
}
