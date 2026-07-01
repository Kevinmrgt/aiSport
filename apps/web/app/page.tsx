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
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <div className="absolute inset-x-1/2 top-[-9rem] -z-10 h-[44rem] w-screen -translate-x-1/2 opacity-80">
        <Image
          src="/visuals/hero-athlete-lime.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-zinc-950/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070a08] via-transparent to-[rgba(7,10,8,0.35)]" />
      </div>

      <div className="grid min-h-[calc(100vh-8rem)] items-center gap-10 py-6 lg:grid-cols-[0.86fr_1.14fr]">
        <div className="max-w-2xl">
          <p className="section-kicker mb-5">Alcide Pulse</p>
          <h1 id="hero-title" className="text-5xl font-black leading-[0.9] tracking-normal text-white sm:text-7xl">
            Vos seances
            <span className="block text-primary-300">en mode app premium.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-zinc-200 sm:text-lg">
            Une interface immersive pour preparer, suivre et journaliser vos entrainements sans
            perdre le fil entre la seance du jour et le cycle complet.
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

      <div className="grid gap-4 pb-10 lg:grid-cols-[1.1fr_0.9fr]">
        <GlassPanel className="relative overflow-hidden p-5 sm:p-6">
          <Image
            src="/visuals/dashboard-bg.webp"
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 680px"
            className="-z-10 object-cover opacity-40"
          />
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="section-kicker mb-3">Tableau de bord</p>
              <h2 className="text-3xl font-black text-white">Progression lisible, pas decoration.</h2>
              <p className="muted-copy mt-2 max-w-xl">
                Les widgets gardent le style des references, mais restent centres sur des donnees
                utiles : duree, effort, historique et prochaine action.
              </p>
            </div>
            <ProgressRing value={74} label="forme" size="lg" />
          </div>
        </GlassPanel>

        <GlassPanel className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
                Workflow
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">Seance prete</h2>
            </div>
            <IconBubble icon="spark" className="bg-primary-300 text-zinc-950" />
          </div>
          <div className="mt-6 space-y-3">
            {['Objectif', 'Structure', 'Timer'].map((label, index) => (
              <div key={label} className="flex items-center gap-3 rounded-full bg-white/[0.07] p-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-zinc-950/60 text-xs font-black text-primary-300">
                  {index + 1}
                </span>
                <span className="text-sm font-bold text-zinc-100">{label}</span>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
