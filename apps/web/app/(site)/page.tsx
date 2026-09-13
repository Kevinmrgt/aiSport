import Link from 'next/link';
import { HomeConfigurator } from '@/components/HomeConfigurator';
import { Icon, type IconName } from '@/components/ui/Icon';

const STEPS: Array<{ title: string; text: string; icon: IconName }> = [
  { title: 'Vos envies', text: 'Sport, niveau, matériel : partez de vous.', icon: 'sliders' },
  {
    title: 'Une séance adaptée',
    text: 'Des exercices et un rythme qui vous conviennent.',
    icon: 'list',
  },
  {
    title: 'Votre progression',
    text: 'Un minuteur et un historique pour suivre vos efforts.',
    icon: 'chart',
  },
];

export default function HomePage() {
  return (
    <div className="home-page">
      <section aria-labelledby="hero-title" className="home-create">
        <h1 id="hero-title" className="page-title">
          Créer une séance
        </h1>
        <HomeConfigurator />
        <Link href="/programs/generate" className="home-program-link">
          Je préfère un programme sur plusieurs semaines
        </Link>
      </section>
      <section id="approche" aria-labelledby="approach-title" className="home-approach">
        <h2 id="approach-title">Un cadre clair. La liberté d’avancer.</h2>
        <div className="approach-steps">
          {STEPS.map((step) => (
            <div className="approach-step" key={step.title}>
              <span className="icon-bubble">
                <Icon name={step.icon} className="h-7 w-7" />
              </span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
