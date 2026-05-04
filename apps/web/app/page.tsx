import Link from 'next/link';

const heroImage =
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80';

// RGAA 4.1: page d'accueil accessible — sémantique HTML5 + contraste AA
export default function HomePage() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden py-6 sm:py-14">
      <div
        aria-hidden="true"
        className="absolute inset-x-1/2 top-0 -z-10 h-[28rem] w-screen -translate-x-1/2 opacity-55"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(7,10,8,0.95), rgba(7,10,8,0.52), rgba(7,10,8,0.95)), url(${heroImage})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      />

      <div className="grid items-center gap-10 sm:min-h-[640px] lg:grid-cols-[1fr_420px]">
        <div className="max-w-2xl">
          <p className="section-kicker mb-4">Fitness app design</p>
          <h1 id="hero-title" className="break-words font-display text-4xl font-black leading-none tracking-tight text-white sm:text-7xl">
            SportCoach IA
            <span className="mt-3 block text-primary-300">entraîne plus net.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-300">
            Générez des séances et des programmes personnalisés, suivez votre rythme, et gardez
            tout votre plan sportif dans une interface sombre, rapide et lisible.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/generate" className="action-primary w-full sm:w-auto">
              Générer une séance
            </Link>
            <Link href="/programs/generate" className="action-secondary w-full sm:w-auto">
              Créer un programme
            </Link>
          </div>

          <dl className="mt-10 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ['7j', 'cycle actif'],
              ['80', 'score forme'],
              ['AI', 'coach prêt'],
            ].map(([value, label]) => (
              <div key={label} className="metric-card">
                <dt className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  {label}
                </dt>
                <dd className="mt-2 text-3xl font-black text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mx-auto w-full max-w-[360px] rounded-[2rem] border border-white/15 bg-zinc-950 p-2 shadow-2xl shadow-primary-400/10 sm:p-3">
          <div className="rounded-[1.5rem] bg-[#10140f] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">Welcome back</p>
                <p className="text-lg font-black text-white">Kevin</p>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-full bg-primary-300 text-sm font-black text-zinc-950">
                80
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-primary-300 p-5 text-zinc-950">
              <p className="text-sm font-black">Running 7 days</p>
              <p className="mt-1 text-xs font-semibold text-zinc-800">8 KM · 1h12 · cardio</p>
              <div className="mt-5 flex h-16 items-end gap-2">
                {[38, 52, 70, 48, 86, 64, 92].map((height, index) => (
                  <span
                    key={index}
                    className="w-full rounded-full bg-zinc-950/80"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="surface-soft p-4">
                <p className="text-xs text-zinc-400">Calories</p>
                <p className="mt-3 text-2xl font-black text-white">620</p>
                <p className="text-xs text-primary-300">kcal</p>
              </div>
              <div className="surface-soft p-4">
                <p className="text-xs text-zinc-400">Heart beat</p>
                <p className="mt-3 text-2xl font-black text-white">80</p>
                <p className="text-xs text-primary-300">bpm</p>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
              <div
                className="h-40 bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(180deg, transparent, rgba(7,10,8,0.92)), url(${heroImage})`,
                }}
              />
              <div className="-mt-16 p-4">
                <p className="text-lg font-black text-white">Full body workout</p>
                <p className="text-xs text-zinc-400">24 tâches · difficulté moyenne</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
