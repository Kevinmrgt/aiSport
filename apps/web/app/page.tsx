import Image from 'next/image';
import Link from 'next/link';
import {
  GlassPanel,
  HeroVisual,
  IconBubble,
  MetricPill,
  ProgressRing,
} from '@/components/PremiumPrimitives';

export default function HomePage() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate -mx-4 overflow-hidden sm:-mx-6 lg:-mx-8">
      <div className="fixed inset-0 -z-20">
        <Image
          src="/visuals/hero-athlete-lime.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-75 brightness-[1.35] saturate-[0.82]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1c2817]/44 via-[#d9e8c5]/38 to-[#f1ffd8]/46" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#dfe8d2]/62 via-[#e9f2d8]/42 to-[#f7ffe8]/24" />
      </div>

      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_72%_20%,rgba(217,255,63,0.5),transparent_30%),radial-gradient(circle_at_28%_68%,rgba(255,255,255,0.42),transparent_24%),linear-gradient(180deg,rgba(246,255,226,0.42),rgba(23,32,20,0.22))]" />

      <div className="grid min-h-[calc(100vh-8rem)] items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.86fr_1.14fr] lg:px-8">
        <div className="max-w-2xl">
          <p className="section-kicker mb-5">Coach sportif IA</p>
          <h1 id="hero-title" className="text-5xl font-black leading-[0.9] tracking-normal text-white sm:text-7xl">
            Alcide prepare
            <span className="block text-primary-300">vos entrainements.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-zinc-200 sm:text-lg">
            Selectionnez votre sport, indiquez vos objectifs et vos contraintes, puis laissez
            l application construire une seance ou un programme complet, pret a suivre avec timer
            et historique.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/generate" className="action-primary w-full sm:w-auto">
              Creer une seance
            </Link>
            <Link href="/programs/generate" className="action-secondary w-full sm:w-auto">
              Planifier un cycle
            </Link>
          </div>

          <div className="mt-10 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricPill icon="timer" label="Format" value="15-180 min" />
            <MetricPill icon="target" label="Suivi" value="Effort /10" tone="lime" />
            <MetricPill icon="layers" label="Cycles" value="2-4 sem." tone="orange" />
          </div>
        </div>

        <HeroVisual className="mx-auto w-full max-w-4xl" />
      </div>

      <div className="space-y-6 px-4 pb-14 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <GlassPanel className="relative overflow-hidden p-5 sm:p-6">
            <Image
              src="/visuals/dashboard-bg.webp"
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 680px"
              className="-z-10 object-cover opacity-45"
            />
            <div className="absolute inset-0 -z-10 bg-[#10170f]/28" />
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="section-kicker mb-3">Presentation</p>
                <h2 className="text-3xl font-black text-white">Une app pour passer de l idee a la seance.</h2>
                <p className="muted-copy mt-2 max-w-xl">
                  Alcide transforme un besoin simple en plan exploitable : echauffement, blocs
                  d exercices, durees, repos et intensite adaptee au niveau.
                </p>
              </div>
              <ProgressRing value={74} label="pret" size="lg" />
            </div>
          </GlassPanel>

          <GlassPanel className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
                  Parcours
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">Seance prete</h2>
              </div>
              <IconBubble icon="spark" className="bg-primary-300 text-zinc-950" />
            </div>
            <div className="mt-6 space-y-3">
              {['Objectif', 'Structure', 'Timer'].map((label, index) => (
                <div key={label} className="flex items-center gap-3 rounded-full bg-zinc-950/[0.42] p-2">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-zinc-950/60 text-xs font-black text-primary-300">
                    {index + 1}
                  </span>
                  <span className="text-sm font-bold text-zinc-100">{label}</span>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              title: 'Personnalisation',
              text: 'Sport, niveau, duree, materiel, contraintes et objectif guident la generation.',
              icon: 'target' as const,
            },
            {
              title: 'Execution',
              text: 'Chaque seance reste lisible pendant l effort avec timer, blocs et progression.',
              icon: 'timer' as const,
            },
            {
              title: 'Suivi',
              text: 'Le tableau de bord garde les seances et programmes pour suivre la charge.',
              icon: 'chart' as const,
            },
          ].map((item) => (
            <GlassPanel key={item.title} className="min-h-56 p-5 sm:p-6">
              <IconBubble icon={item.icon} className="bg-zinc-950/[0.72] text-primary-200" />
              <h2 className="mt-5 text-2xl font-black text-white">{item.title}</h2>
              <p className="muted-copy mt-3">{item.text}</p>
            </GlassPanel>
          ))}
        </div>

        <div className="grid min-h-[70vh] items-center gap-6 rounded-[2rem] border border-white/15 bg-[#14200f]/45 p-5 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-8 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="section-kicker mb-4">Scroll immersif</p>
            <h2 className="text-4xl font-black leading-none text-white sm:text-5xl">
              Le fond reste en place,
              <span className="block text-primary-300">le contenu avance.</span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-200">
              La page d accueil presente maintenant l application avant de pousser vers la
              creation : ce que fait Alcide, comment l utiliser, et pourquoi revenir suivre sa
              progression.
            </p>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative min-h-[26rem] flex-1 overflow-hidden rounded-[1.6rem] border border-white/10">
              <Image
                src="/visuals/workout-action.webp"
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 620px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5">
                <p className="section-kicker mb-3">En action</p>
                <h3 className="text-3xl font-black text-white">Suivre sans reflechir.</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
