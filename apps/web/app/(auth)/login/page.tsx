import { signIn } from '@/lib/auth';
import { GlassPanel, IconBubble, MetricPill } from '@/components/PremiumPrimitives';

export default function LoginPage() {
  return (
    <div className="grid min-h-[72vh] items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <section
        aria-labelledby="login-title"
        className="max-w-xl rounded-[2rem] border border-white/15 bg-zinc-950/75 p-5 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-8"
      >
        <p className="section-kicker mb-4">Acces Alcide</p>
        <h1 id="login-title" className="page-title">
          Reprendre votre entrainement.
        </h1>
        <p className="muted-copy mt-4 max-w-md">
          Connectez-vous pour retrouver vos seances, vos programmes et votre progression dans
          l espace Alcide Pulse.
        </p>

        <form
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: '/generate' });
          }}
          className="mt-8"
        >
          <button
            type="submit"
            className="action-primary w-full max-w-sm justify-between gap-4 pl-5 pr-3 sm:w-auto"
          >
            <span>Continuer avec Google</span>
            <span
              aria-hidden="true"
              className="grid h-10 w-10 place-items-center rounded-full bg-zinc-950 text-white"
            >
              G
            </span>
          </button>
        </form>
      </section>

      <div className="relative mx-auto w-full max-w-[25rem]">
        <div className="phone-frame min-h-[42rem]">
          <div className="abstract-frame-bg" aria-hidden="true" />
          <div className="relative z-10 flex min-h-[42rem] flex-col justify-between p-5 pt-16">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-black text-white">Alcide</p>
                <p className="text-sm font-bold text-primary-300">Pulse access</p>
              </div>
              <IconBubble icon="home" />
            </div>

            <GlassPanel className="space-y-5 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary-300">
                  Session
                </p>
                <h2 className="mt-2 text-3xl font-black leading-tight text-white">
                  Votre espace training est pret.
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MetricPill icon="activity" label="Seances" value="Perso" />
                <MetricPill icon="chart" label="Suivi" value="Actif" tone="lime" />
              </div>
            </GlassPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
